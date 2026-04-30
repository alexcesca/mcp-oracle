import { Prompt } from "@modelcontextprotocol/sdk/types.js";

export const gerarPackageTabelaDefinition: Prompt = {
  name: "gerar_package_tabela",
  description: "Template para começar a criar package de tabela dentro dos padrões do SIGA.",
  arguments: [
    {
      name: "nome_tabela",
      description: "Nome da tabela principal alvo do pacote",
      required: true,
    },
    {
      name: "desenvolvedor",
      description: "Nome do desenvolvedor",
      required: true,
    },
    {
      name: "nome_pacote",
      description: "Nome do pacote principal alvo do pacote",
      required: true,
    },
    {
      name: "shortName",
      description:
        "Nome curto personalizado opcional para a tabela (ex: 'BEMIMOBEFD'). Se omitido, será derivado automaticamente do nome da tabela.",
    },
  ],
};

export function gerarPackageTabelaHandler(args: any) {
  const tabela = args?.nome_tabela || "Tabela não identificada";
  return {
    description: "Carrega referências de padronização SIGA e instrução de persona",
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Aja como um Arquiteto de Sistemas Oracle experiente. 
Vamos construir um pacote para a tabela ${tabela}. 
Lembre-se de as premissas de tipos de variaveis, campos, identação, etc, conforme definição do SIGA. Separe PKS e PKB.`,
        },
      },
    ],
  };
}
