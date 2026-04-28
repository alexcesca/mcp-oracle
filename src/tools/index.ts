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
export async function dispatchTool(
  name: string,
  args: Record<string, any>
): Promise<any> {
  switch (name) {
    case "list_tables":
      return listTablesHandler(args as { pattern?: string });
    case "describe_table":
      return describeTableHandler(args as { tableName: string });
    case "execute_query":
      return executeQueryHandler(args as { query: string; maxRows?: number });
    case "list_packages":
      return listPackagesHandler(args as { pattern?: string });
    case "validate_package_standards":
      return validatePackageStandardsHandler(args as { packageName: string });
    case "generate_table_package":
      return generateTablePackageHandler(args as { tableName: string; moduleName?: string; shortName?: string; author?: string });
    case "get_coupling":
      return getCouplingHandler(args as { packageOrigem?: string; packageChamada?: string; moduloOrigem?: string; moduloChamado?: string; maxRows?: number });
    case "get_sobra_avc":
      return getSobraAvcHandler(args as { startDate: string; endDate: string });
    case "get_table_indexes":
      return getTableIndexesHandler(args as { tableName: string; includeStats?: boolean });
    default:
      return null; // Caller handles unknown tool error
  }
}
