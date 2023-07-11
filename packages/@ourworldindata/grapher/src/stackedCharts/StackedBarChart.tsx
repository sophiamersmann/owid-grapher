import React from "react"
import { computed, action, observable } from "mobx"
import { observer } from "mobx-react"
import { Bounds, Time, uniq, makeSafeForCSS, sum } from "@ourworldindata/utils"
import {
    VerticalAxisComponent,
    AxisTickMarks,
    VerticalAxisGridLines,
} from "../axis/AxisViews"
import { NoDataModal } from "../noDataModal/NoDataModal"
import { Text } from "../text/Text"
import {
    VerticalColorLegend,
    VerticalColorLegendManager,
    LegendItem,
} from "../verticalColorLegend/VerticalColorLegend"
import { Tooltip } from "../tooltip/Tooltip"
import { BASE_FONT_SIZE } from "../core/GrapherConstants"
import { ColorScaleManager } from "../color/ColorScale"
import {
    AbstractStackedChart,
    AbstractStackedChartProps,
} from "./AbstractStackedChart"
import { StackedPoint, StackedSeries } from "./StackedConstants"
import { VerticalAxis } from "../axis/Axis"
import { ColorSchemeName } from "../color/ColorConstants"
import { stackSeries, withMissingValuesAsZeroes } from "./StackedUtils"
import { makeClipPath } from "../chart/ChartUtils"
import { ColorScaleConfigDefaults } from "../color/ColorScaleConfig"
import { ColumnTypeMap } from "@ourworldindata/core-table"

interface StackedBarSegmentProps extends React.SVGAttributes<SVGGElement> {
    bar: StackedPoint<Time>
    series: StackedSeries<Time>
    color: string
    opacity: number
    yAxis: VerticalAxis
    xOffset: number
    barWidth: number
    onBarMouseOver: (
        bar: StackedPoint<Time>,
        series: StackedSeries<Time>
    ) => void
    onBarMouseLeave: () => void
}

interface TickmarkPlacement {
    time: number
    text: string
    bounds: Bounds
    isHidden: boolean
}

@observer
class StackedBarSegment extends React.Component<StackedBarSegmentProps> {
    base: React.RefObject<SVGRectElement> = React.createRef()

    @observable mouseOver: boolean = false

    @computed get yPos(): number {
        const { bar, yAxis } = this.props
        return yAxis.place(bar.value + bar.valueOffset)
    }

    @computed get barHeight(): number {
        const { bar, yAxis } = this.props
        return yAxis.place(bar.valueOffset) - this.yPos
    }

    @computed get trueOpacity(): number {
        return this.mouseOver ? 1 : this.props.opacity
    }

    @action.bound onBarMouseOver(): void {
        this.mouseOver = true
        this.props.onBarMouseOver(this.props.bar, this.props.series)
    }

    @action.bound onBarMouseLeave(): void {
        this.mouseOver = false
        this.props.onBarMouseLeave()
    }

    render(): JSX.Element {
        const { color, xOffset, barWidth } = this.props
        const { yPos, barHeight, trueOpacity } = this

        return (
            <rect
                ref={this.base}
                x={xOffset}
                y={yPos}
                width={barWidth}
                height={barHeight}
                fill={color}
                opacity={trueOpacity}
                onMouseOver={this.onBarMouseOver}
                onMouseLeave={this.onBarMouseLeave}
            />
        )
    }
}

@observer
export class StackedBarChart
    extends AbstractStackedChart
    implements VerticalColorLegendManager, ColorScaleManager
{
    readonly minBarSpacing = 4

    constructor(props: AbstractStackedChartProps) {
        super(props)
    }

    // currently hovered legend color
    @observable hoverColor?: string
    // currently hovered axis label
    @observable hoveredTick?: TickmarkPlacement
    // current hovered individual bar
    @observable hoverBar?: StackedPoint<Time>
    @observable hoverSeries?: StackedSeries<Time>

    @computed private get baseFontSize(): number {
        return this.manager.baseFontSize ?? BASE_FONT_SIZE
    }

    @computed get tickFontSize(): number {
        return 0.9 * this.baseFontSize
    }

    @computed get barWidth(): number {
        const { dualAxis } = this

        return (0.8 * dualAxis.innerBounds.width) / this.xValues.length
    }

    @computed get barSpacing(): number {
        return (
            this.dualAxis.innerBounds.width / this.xValues.length -
            this.barWidth
        )
    }

    @computed get barFontSize(): number {
        return 0.75 * this.baseFontSize
    }

    @computed protected get paddingForLegend(): number {
        return this.sidebarWidth + 20
    }

    @computed get shouldRunLinearInterpolation(): boolean {
        // disabled by default
        return this.props.enableLinearInterpolation ?? false
    }

    // All currently hovered group keys, combining the legend and the main UI
    @computed get hoverKeys(): string[] {
        const { hoverColor, manager } = this
        const { externalLegendFocusBin } = manager

        const hoverKeys =
            hoverColor === undefined
                ? []
                : uniq(
                      this.series
                          .filter((g) => g.color === hoverColor)
                          .map((g) => g.seriesName)
                  )
        if (externalLegendFocusBin) {
            hoverKeys.push(
                ...this.rawSeries
                    .map((g) => g.seriesName)
                    .filter((name) => externalLegendFocusBin.contains(name))
            )
        }

        return hoverKeys
    }

    @computed get activeColors(): string[] {
        const { hoverKeys } = this
        const activeKeys = hoverKeys.length > 0 ? hoverKeys : []

        if (!activeKeys.length)
            // No hover means they're all active by default
            return uniq(this.series.map((g) => g.color))

        return uniq(
            this.series
                .filter((g) => activeKeys.indexOf(g.seriesName) !== -1)
                .map((g) => g.color)
        )
    }

    @computed get legendItems(): LegendItem[] {
        return this.series
            .map((series) => {
                return {
                    label: series.seriesName,
                    color: series.color,
                }
            })
            .reverse() // Vertical legend orders things in the opposite direction we want
    }

    @computed get maxLegendWidth(): number {
        return this.sidebarMaxWidth
    }

    @computed get sidebarMaxWidth(): number {
        return this.bounds.width / 5
    }
    @computed get sidebarMinWidth(): number {
        return 100
    }
    @computed get sidebarWidth(): number {
        if (this.manager.hideLegend) return 0
        const { sidebarMinWidth, sidebarMaxWidth, legendDimensions } = this
        return Math.max(
            Math.min(legendDimensions.width, sidebarMaxWidth),
            sidebarMinWidth
        )
    }

    @computed private get legendDimensions(): VerticalColorLegend {
        return new VerticalColorLegend({ manager: this })
    }

    @computed get tooltip(): JSX.Element | undefined {
        const {
            hoverBar,
            mapXValueToOffset,
            barWidth,
            dualAxis,
            yColumns,
            hoverSeries,
            series,
            hoveredTick,
        } = this

        let hoverTime: number
        let yPos: number

        if (hoverBar !== undefined) {
            hoverTime = hoverBar.position
            yPos = dualAxis.verticalAxis.place(
                hoverBar.valueOffset + hoverBar.value
            )
        } else if (hoveredTick !== undefined) {
            hoverTime = hoveredTick.time
            yPos = dualAxis.verticalAxis.rangeMax
        } else return

        const xPos = mapXValueToOffset.get(hoverTime)
        if (xPos === undefined) return

        const yColumn = yColumns[0] // we can just use the first column for formatting, b/c we assume all columns have same type
        const seriesRows = [...series].reverse().map((series) => ({
            seriesName: series.seriesName,
            color: series.color,
            isHovered: hoverSeries?.seriesName === series.seriesName,
            point: series.points.find((bar) => bar.position === hoverTime),
        }))
        const totalValue = sum(seriesRows.map((bar) => bar.point?.value ?? 0))
        const allFake = seriesRows.every((bar) => bar.point?.fake)
        const showTotalValue = seriesRows.length > 1 && !allFake
        return (
            <Tooltip
                id={this.renderUid}
                tooltipManager={this.props.manager}
                x={xPos + barWidth}
                y={yPos}
                style={{ padding: "0.3em" }}
                offsetX={4}
            >
                <table style={{ fontSize: "0.9em", lineHeight: "1.4em" }}>
                    <tbody>
                        <tr>
                            <td colSpan={3}>
                                <strong>{yColumn.formatTime(hoverTime)}</strong>
                            </td>
                        </tr>
                        {seriesRows.map(
                            ({ seriesName, color, isHovered, point }) => (
                                <tr
                                    key={seriesName}
                                    style={{
                                        color: point?.fake
                                            ? "#888"
                                            : isHovered
                                            ? "#000"
                                            : "#333",
                                        fontWeight: isHovered
                                            ? "bold"
                                            : undefined,
                                    }}
                                >
                                    <td>
                                        <div
                                            style={{
                                                width: "10px",
                                                height: "10px",
                                                display: "inline-block",
                                                marginRight: "2px",
                                                backgroundColor: color,
                                            }}
                                        />
                                    </td>
                                    <td>{seriesName}</td>
                                    <td
                                        style={{
                                            textAlign: "right",
                                            whiteSpace: "nowrap",
                                            paddingLeft: "0.8em",
                                        }}
                                    >
                                        {point?.fake
                                            ? "No data"
                                            : yColumn.formatValueLong(
                                                  point?.value,
                                                  {
                                                      trailingZeroes: true,
                                                  }
                                              )}
                                    </td>
                                </tr>
                            )
                        )}
                        {showTotalValue && (
                            <tr>
                                <td></td>
                                <td>Total</td>
                                <td
                                    style={{
                                        textAlign: "right",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {yColumn.formatValueLong(totalValue, {
                                        trailingZeroes: true,
                                    })}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </Tooltip>
        )
    }

    @computed get mapXValueToOffset(): Map<number, number> {
        const { dualAxis, barWidth, barSpacing } = this

        const xValueToOffset = new Map<number, number>()
        let xOffset = dualAxis.innerBounds.left + barSpacing

        for (const xValue of this.xValues) {
            xValueToOffset.set(xValue, xOffset)
            xOffset += barWidth + barSpacing
        }
        return xValueToOffset
    }

    // Place ticks centered beneath the bars, before doing overlap detection
    @computed private get tickPlacements(): TickmarkPlacement[] {
        const { mapXValueToOffset, barWidth, dualAxis } = this
        const { xValues } = this
        const { horizontalAxis } = dualAxis

        return xValues.map((x) => {
            const text = horizontalAxis.formatTick(x)
            const xPos = mapXValueToOffset.get(x) as number

            const bounds = Bounds.forText(text, { fontSize: this.tickFontSize })
            return {
                time: x,
                text,
                bounds: bounds.set({
                    x: xPos + barWidth / 2 - bounds.width / 2,
                    y: dualAxis.innerBounds.bottom + 5,
                }),
                isHidden: false,
            }
        })
    }

    @computed get ticks(): TickmarkPlacement[] {
        const { tickPlacements } = this

        for (let i = 0; i < tickPlacements.length; i++) {
            for (let j = 1; j < tickPlacements.length; j++) {
                const t1 = tickPlacements[i],
                    t2 = tickPlacements[j]

                if (t1 === t2 || t1.isHidden || t2.isHidden) continue

                if (t1.bounds.intersects(t2.bounds.padWidth(-5))) {
                    if (i === 0) t2.isHidden = true
                    else if (j === tickPlacements.length - 1) t1.isHidden = true
                    else t2.isHidden = true
                }
            }
        }

        return tickPlacements.filter((t) => !t.isHidden)
    }

    @action.bound onLegendMouseOver(color: string): void {
        this.hoverColor = color
    }

    @action.bound onLegendMouseLeave(): void {
        this.hoverColor = undefined
    }

    @action.bound onLabelMouseOver(tick: TickmarkPlacement): void {
        this.hoveredTick = tick
    }

    @action.bound onLabelMouseLeave(): void {
        this.hoveredTick = undefined
    }

    @action.bound onBarMouseOver(
        bar: StackedPoint<Time>,
        series: StackedSeries<Time>
    ): void {
        this.hoverBar = bar
        this.hoverSeries = series
    }

    @action.bound onBarMouseLeave(): void {
        this.hoverBar = undefined
        this.hoverSeries = undefined
    }

    render(): JSX.Element {
        if (this.failMessage)
            return (
                <NoDataModal
                    manager={this.manager}
                    bounds={this.bounds}
                    message={this.failMessage}
                />
            )

        const {
            dualAxis,
            renderUid,
            bounds,
            tooltip,
            barWidth,
            mapXValueToOffset,
            ticks,
        } = this
        const { series } = this
        const { innerBounds, verticalAxis } = dualAxis

        const textColor = "#666"

        const clipPath = makeClipPath(renderUid, innerBounds)

        return (
            <g
                className="StackedBarChart"
                width={bounds.width}
                height={bounds.height}
            >
                {clipPath.element}

                <rect
                    x={bounds.left}
                    y={bounds.top}
                    width={bounds.width}
                    height={bounds.height}
                    opacity={0}
                    fill="rgba(255,255,255,0)"
                />
                <VerticalAxisComponent
                    bounds={bounds}
                    verticalAxis={verticalAxis}
                />
                <VerticalAxisGridLines
                    verticalAxis={verticalAxis}
                    bounds={innerBounds}
                />

                <AxisTickMarks
                    tickMarkTopPosition={innerBounds.bottom}
                    tickMarkXPositions={ticks.map(
                        (tick) => tick.bounds.centerX
                    )}
                    color={textColor}
                />

                <g>
                    {ticks.map((tick, i) => {
                        return (
                            <Text
                                key={i}
                                x={tick.bounds.x}
                                y={tick.bounds.y}
                                fill={textColor}
                                fontSize={this.tickFontSize}
                                onMouseOver={(): void => {
                                    this.onLabelMouseOver(tick)
                                }}
                                onMouseLeave={this.onLabelMouseLeave}
                            >
                                {tick.text}
                            </Text>
                        )
                    })}
                </g>

                <g clipPath={clipPath.id}>
                    {series.map((series, index) => {
                        const isLegendHovered = this.hoverKeys.includes(
                            series.seriesName
                        )
                        const opacity =
                            isLegendHovered || this.hoverKeys.length === 0
                                ? 0.8
                                : 0.2

                        return (
                            <g
                                key={index}
                                className={
                                    makeSafeForCSS(series.seriesName) +
                                    "-segments"
                                }
                            >
                                {series.points.map((bar, index) => {
                                    const xPos = mapXValueToOffset.get(
                                        bar.position
                                    ) as number
                                    const barOpacity =
                                        bar === this.hoverBar ? 1 : opacity

                                    return (
                                        <StackedBarSegment
                                            key={index}
                                            bar={bar}
                                            color={series.color}
                                            xOffset={xPos}
                                            opacity={barOpacity}
                                            yAxis={verticalAxis}
                                            series={series}
                                            onBarMouseOver={this.onBarMouseOver}
                                            onBarMouseLeave={
                                                this.onBarMouseLeave
                                            }
                                            barWidth={barWidth}
                                        />
                                    )
                                })}
                            </g>
                        )
                    })}
                </g>

                {!this.manager.hideLegend && (
                    <VerticalColorLegend manager={this} />
                )}
                {tooltip}
            </g>
        )
    }

    @computed get legendY(): number {
        return this.bounds.top
    }

    @computed get legendX(): number {
        return this.bounds.right - this.sidebarWidth
    }

    @computed private get xValues(): number[] {
        return uniq(this.allStackedPoints.map((bar) => bar.position))
    }

    @computed get colorScaleConfig(): ColorScaleConfigDefaults | undefined {
        return this.manager.colorScale
    }

    defaultBaseColorScheme = ColorSchemeName.stackedAreaDefault

    @computed get series(): readonly StackedSeries<number>[] {
        // TODO: remove once monthly data is supported (https://github.com/owid/owid-grapher/issues/2007)
        const enforceUniformSpacing = !(
            this.transformedTable.timeColumn instanceof ColumnTypeMap.Day
        )

        return stackSeries(
            withMissingValuesAsZeroes(this.unstackedSeries, {
                enforceUniformSpacing,
            })
        )
    }
}
