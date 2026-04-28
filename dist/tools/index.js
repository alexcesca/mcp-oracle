import { listTablesDefinition, listTablesHandler } from "./list-tables.js";
import { describeTableDefinition, describeTableHandler } from "./describe-table.js";
import { executeQueryDefinition, executeQueryHandler } from "./execute-query.js";
import { listPackagesDefinition, listPackagesHandler } from "./list-packages.js";
import { validatePackageStandardsDefinition, validatePackageStandardsHandler } from "./validate-package.js";
import { generateTablePackageDefinition, generateTablePackageHandler } from "./generate-table-package.js";
import { getCouplingDefinition, getCouplingHandler } from "./get-coupling.js";
import { getSobraAvcDefinition, getSobraAvcHandler } from "./get-sobra-avc.js";
import { getTableIndexesDefinition, getTableIndexesHandler } from "./get-table-indexes.js";
/** All registered tool definitions (used in ListTools response) */
export const toolDefinitions = [
    listTablesDefinition,
    describeTableDefinition,
    executeQueryDefinition,
    listPackagesDefinition,
    validatePackageStandardsDefinition,
    generateTablePackageDefinition,
    getCouplingDefinition,
    getSobraAvcDefinition,
    getTableIndexesDefinition,
];
/** Dispatches a tool call to the corresponding handler */
export async function dispatchTool(name, args) {
    switch (name) {
        case "list_tables":
            return listTablesHandler(args);
        case "describe_table":
            return describeTableHandler(args);
        case "execute_query":
            return executeQueryHandler(args);
        case "list_packages":
            return listPackagesHandler(args);
        case "validate_package_standards":
            return validatePackageStandardsHandler(args);
        case "generate_table_package":
            return generateTablePackageHandler(args);
        case "get_coupling":
            return getCouplingHandler(args);
        case "get_sobra_avc":
            return getSobraAvcHandler(args);
        case "get_table_indexes":
            return getTableIndexesHandler(args);
        default:
            return null; // Caller handles unknown tool error
    }
}
