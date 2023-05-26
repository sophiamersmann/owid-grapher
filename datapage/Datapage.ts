import * as fs from "fs-extra"
import { GIT_CMS_DIR } from "../gitCms/GitCmsConstants.js"
import { Value } from "@sinclair/typebox/value"
import {
    OwidEnrichedGdocBlock,
    OwidGdocInterface,
    pick,
    getLinkType,
    getUrlTarget,
    GdocsContentSource,
    DataPageGdoc,
    DataPageJson,
    DataPageJsonTypeObject,
    DataPageParseError,
    AllowedDataPageGdocFields,
} from "@ourworldindata/utils"
import { ExplorerProgram } from "../explorer/ExplorerProgram.js"
import { Gdoc } from "../db/model/Gdoc/Gdoc.js"

export const getDatapageJson = async (
    variableId: number
): Promise<{
    datapageJson: DataPageJson | null
    parseErrors: DataPageParseError[]
}> => {
    let datapageJson: DataPageJson | null = null
    try {
        const fullPath = `${GIT_CMS_DIR}/datapages/${variableId}.json`
        const datapageJsonFile = await fs.readFile(fullPath, "utf8")
        datapageJson = JSON.parse(datapageJsonFile)
    } catch (err: any) {
        // An error has been thrown either because:
        // - the file doesn't exist: it simply means we don't have a datapage
        //   yet, and we just render a regular grapher page instead by returning
        //   neither a datapage, nor parsing errors
        // - the file exists but fails to parse because it contains invalid
        //   JSON. In this case, we return parsing errors.
        if (err.code === "ENOENT") {
            return {
                datapageJson: null,
                parseErrors: [],
            }
        } else {
            return {
                datapageJson: null,
                parseErrors: [
                    {
                        message: err.message,
                    },
                ],
            }
        }
    }

    // Validate the datapage JSON file against the DataPageJson schema
    if (Value.Check(DataPageJsonTypeObject, datapageJson)) {
        return { datapageJson, parseErrors: [] }
    } else {
        return {
            datapageJson,
            parseErrors: [
                ...Value.Errors(DataPageJsonTypeObject, datapageJson),
            ].map(({ message, path }) => ({ message, path })),
        }
    }
}

/**
 * Get the datapage companion gdoc, if any.
 *
 * When previewing, we want to render the datapage from the live gdoc.
 * Otherwise, we're baking from the gdoc parsed and saved in the database
 * following a visit to /admin/gdocs/[googleDocId]/preview
 */
export const getDatapageGdoc = async (
    datapageJson: DataPageJson,
    isPreviewing: boolean,
    publishedExplorersBySlug?: Record<string, ExplorerProgram>
): Promise<DataPageGdoc | null> => {
    // Get the google doc id from the datapage JSON file and return early if
    // none found
    const googleDocId =
        getLinkType(datapageJson.googleDocEditLink) === "gdoc"
            ? getUrlTarget(datapageJson.googleDocEditLink)
            : null

    if (!googleDocId) return null

    // When previewing, we want to render the datapage from the live gdoc,
    // but only if the user has set up the necessary auth keys to access the
    // Google Doc API. This won't be the case for external contributors or
    // possibly data engineers focusing on the data pipeline. In those
    // cases, we grab the gdoc found in the database, if any.
    const rawDatapageGdoc =
        isPreviewing && publishedExplorersBySlug && Gdoc.areGdocAuthKeysSet()
            ? await Gdoc.getGdocFromContentSource(
                  googleDocId,
                  publishedExplorersBySlug,
                  GdocsContentSource.Gdocs
              )
            : await Gdoc.findOneBy({ id: googleDocId })

    if (!rawDatapageGdoc) return null

    // Split the gdoc content into fields using the heading one texts as field
    // names. Any top level key that is not in AllowedDataPageGdocFields will
    // be silently filtered out. Beyond that, any allowed field can contain the
    // whole range of OwidEnrichedGdocBlock types.
    return parseGdocContentFromAllowedLevelOneHeadings(rawDatapageGdoc)
}

/*
 * Takes a gdoc and splits its content into sections based on the heading 1s.

* The heading 1 texts are used as keys, which can represent a nested structure,
 * e.g. `descriptionFromSource.content`. 
 *
 * Validation: only a subset of the possible fields found is allowed (see
 * AllowedDataPageGdocFields). This means the gdoc can contain extra heading
 * one texts (e.g. for documentation) that will be ignored without raising
 * errors.
 *  */
export const parseGdocContentFromAllowedLevelOneHeadings = (
    gdoc: OwidGdocInterface
): DataPageGdoc => {
    let currentKey = ""
    const keyedBlocks: Record<string, OwidEnrichedGdocBlock[]> = {}

    // We want to split the content of the gdoc into sections based on the
    // heading 1s. Each section will be stored under a new key named after the
    // preceeding heading 1's text, which have been specially crafted for this
    // purpose
    gdoc.content.body?.forEach((block: any) => {
        if (block.type === "heading" && block.level === 1) {
            // Use the heading 1's text as a key through a very raw version of
            // "spansToSimpleText". `currentKey` can represent a nested key, e.g.
            // `descriptionFromSource.content`
            currentKey = block.text[0].text
        } else {
            // If the current block is not a heading 1, we append its value to
            // the content of the current key
            keyedBlocks[currentKey] = [
                ...(keyedBlocks[currentKey] || []),
                block,
            ]
        }
    })

    // We only keep the allowed keys, silently filtering out the rest
    return pick(keyedBlocks, AllowedDataPageGdocFields)
}