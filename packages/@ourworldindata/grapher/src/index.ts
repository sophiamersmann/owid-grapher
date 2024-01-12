import "./core/grapher.scss"

export { binningStrategyLabels } from "./color/BinningStrategies"
export {
    NumericBin,
    CategoricalBin,
    type ColorScaleBin,
} from "./color/ColorScaleBin"
export { ChartDimension } from "./chart/ChartDimension"
export {
    GRAPHER_EMBEDDED_FIGURE_ATTR,
    GRAPHER_EMBEDDED_FIGURE_CONFIG_ATTR,
    GRAPHER_PAGE_BODY_CLASS,
    GRAPHER_SETTINGS_DRAWER_ID,
    GRAPHER_IS_IN_IFRAME_CLASS,
    DEFAULT_GRAPHER_WIDTH,
    DEFAULT_GRAPHER_HEIGHT,
    STATIC_EXPORT_DETAIL_SPACING,
    DEFAULT_GRAPHER_ENTITY_TYPE,
    GRAPHER_LOADED_EVENT_NAME,
    ALL_GRAPHERS_LOADED_EVENT_NAME,
    CookieKey,
    BASE_FONT_SIZE,
    ThereWasAProblemLoadingThisChart,
    WorldEntityName,
    getVariableDataRoute,
    getVariableMetadataRoute,
    Patterns,
    grapherInterfaceWithHiddenControlsOnly,
    grapherInterfaceWithHiddenTabsOnly,
} from "./core/GrapherConstants"
export { ColorScale } from "./color/ColorScale"
export { ColorScaleConfig } from "./color/ColorScaleConfig"
export { ColorScheme } from "./color/ColorScheme"
export {
    getColorNameOwidDistinctAndSemanticPalettes,
    getColorNameOwidDistinctLinesAndSemanticPalettes,
} from "./color/CustomSchemes"
export { ColorSchemes } from "./color/ColorSchemes"
export { DimensionSlot } from "./chart/DimensionSlot"
export { EntityPicker } from "./controls/entityPicker/EntityPicker"
export type { EntityPickerManager } from "./controls/entityPicker/EntityPickerConstants"
export { getColorSchemeForChartType } from "./color/ColorSchemes"
export {
    GLOBAL_ENTITY_SELECTOR_DATA_ATTR,
    GLOBAL_ENTITY_SELECTOR_ELEMENT,
    GLOBAL_ENTITY_SELECTOR_DEFAULT_COUNTRY,
} from "./controls/globalEntitySelector/GlobalEntitySelectorConstants"
export { GlobalEntitySelector } from "./controls/globalEntitySelector/GlobalEntitySelector"
export {
    Grapher,
    type GrapherProgrammaticInterface,
    type GrapherManager,
    getErrorMessageRelatedQuestionUrl,
} from "./core/Grapher"
export { GrapherAnalytics, EventCategory } from "./core/GrapherAnalytics"
import fuzzysort from "fuzzysort"
export { fuzzysort }
export { highlight } from "./controls/FuzzySearch"
export { hydrateGlobalEntitySelectorIfAny } from "./controls/globalEntitySelector/GlobalEntitySelector"
export { legacyToCurrentGrapherUrl } from "./core/GrapherUrlMigrations"
export { legacyToOwidTableAndDimensions } from "./core/LegacyToOwidTable"
export { LoadingIndicator } from "./loadingIndicator/LoadingIndicator"
export { MapChart } from "./mapCharts/MapChart"
export { MapConfig } from "./mapCharts/MapConfig"
export {
    MapProjectionLabels,
    MapProjectionGeos,
} from "./mapCharts/MapProjections"
export { SelectionArray } from "./selection/SelectionArray"
export {
    setSelectedEntityNamesParam,
    migrateSelectedEntityNamesParam,
    getSelectedEntityNamesParam,
} from "./core/EntityUrlBuilder"
export { SparkBars, type SparkBarsProps } from "./sparkBars/SparkBars"
export {
    type SlideShowManager,
    SlideShowController,
} from "./slideshowController/SlideShowController"
