#! /usr/bin/env node

import parseArgs from "minimist"
import fs from "fs-extra"

function generateDefaultObjectFromSchema(
    schema: Record<string, any>,
    defs: Record<string, any> = {}
) {
    const defaultObject: Record<string, any> = {}
    if (schema.type === "object") {
        for (let key in schema.properties) {
            // substitute $ref with the actual definition
            const ref = schema.properties[key].$ref
            if (ref != undefined) {
                const regex = /#\/\$defs\/([a-zA-Z]+)/
                const [_, defKey] = ref.match(regex) ?? []
                const def = defs[defKey]
                if (def == undefined)
                    throw new Error(`Definition "${ref}" not found`)
                schema.properties[key] = def
            }

            if (schema.properties[key].type === "object") {
                const defaults = generateDefaultObjectFromSchema(
                    schema.properties[key],
                    defs
                )
                if (Object.keys(defaults).length) defaultObject[key] = defaults
            } else if (schema.properties[key].default != undefined) {
                defaultObject[key] = schema.properties[key].default
            }
        }
    }
    return defaultObject
}

async function main(parsedArgs: parseArgs.ParsedArgs) {
    const schemaFilename = parsedArgs._[0]
    if (schemaFilename == undefined) {
        help()
        process.exit(0)
    }

    let schema = fs.readJSONSync(schemaFilename)
    const defs = schema.$defs || {}
    const defaultObject = generateDefaultObjectFromSchema(schema, defs)
    process.stdout.write(JSON.stringify(defaultObject, undefined, 2))
}

function help() {
    console.log(`generate-default-object-from-schema.ts - utility to generate an object with all default values that are given in a JSON schema

Usage:
  generate-default-object-from-schema.js <schema.json>`)
}

const parsedArgs = parseArgs(process.argv.slice(2))
if (parsedArgs["h"] || parsedArgs["help"]) {
    help()
    process.exit(0)
} else {
    main(parsedArgs)
}
