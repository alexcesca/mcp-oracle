// Import definitions and handlers
import { gerarPackageTabelaDefinition, gerarPackageTabelaHandler } from "./gerar-package-tabela.js";
import { agenteConsultaDadosDefinition, agenteConsultaDadosHandler } from "./agente-consulta-dados.js";
import { analisarSobrasAvesDefinition, analisarSobrasAvesHandler } from "./analisar-sobras-aves.js";
import { analisarAcoplamentoDefinition, analisarAcoplamentoHandler } from "./analisar-acoplamento.js";
import { validatePackageDefinition, validatePackageHandler } from "./validate-package.js";
// Lista de definição visual dos prompts
export const promptDefinitions = [
    gerarPackageTabelaDefinition,
    agenteConsultaDadosDefinition,
    analisarSobrasAvesDefinition,
    analisarAcoplamentoDefinition,
    validatePackageDefinition,
];
// O despachante de prompts (GetPrompt Handler)
export function dispatchPrompt(name, args) {
    switch (name) {
        case "gerar_package_tabela":
            return gerarPackageTabelaHandler(args);
        case "agente_consulta_dados":
            return agenteConsultaDadosHandler(args);
        case "analisar_sobras_aves":
            return analisarSobrasAvesHandler(args);
        case "analisar_acoplamento":
            return analisarAcoplamentoHandler(args);
        case "validate_package":
            return validatePackageHandler(args);
        default:
            return null;
    }
}
