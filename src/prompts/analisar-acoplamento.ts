import { Prompt } from "@modelcontextprotocol/sdk/types.js";

export const analisarAcoplamentoDefinition: Prompt = {
  name: "analisar_acoplamento",
  description: "Prompt especializado em contar acoplamentos metodológicos e fazer análise arquitetural (origem/chamado).",
  arguments: [],
};

export function analisarAcoplamentoHandler(args: any) {
  return {
    description: "Diretrizes para contagem de acoplamentos e parecer estrutural SIGA",
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Você é um Arquiteto de Software sênior e deve analisar o acoplamento entre módulos do sistema.

Para obter os dados necessários, você deve OBRIGATORIAMENTE chamar a ferramenta 'get_coupling'.
- A ferramenta traz os dados resumidos com as colunas: modulo_chamador, modulo_chamado, qtde_chamada.
- Extraia do contexto do usuário se ele deseja filtrar por um Módulo Chamador ou Módulo Chamado específico e repasse como filtros para a tool. Lembre-se de preencher sempre o metadata obrigatório na chamada da tool.

Objetivo:
Produzir uma análise arquitetural do acoplamento entre módulos, identificando hotspots, dependências críticas, padrões, riscos e recomendações de melhoria.

Regras:
1) Trabalhe exclusivamente com os dados extraídos através da tool 'get_coupling'. Não invente módulos, relações ou números.
2) Considere QTDE_CHAMADA como proxy de intensidade de dependência.
3) Diferencie:
   - Acoplamento de saída (fan-out): quantas e quão fortes são as dependências que um módulo FAZ para outros.
   - Acoplamento de entrada (fan-in): quantas e quão fortes são as dependências que um módulo RECEBE de outros.
4) Trate como “alto acoplamento” as relações com QTDE_CHAMADA significativamente acima das demais (use ranking/top N e distribuição simples; se não calcular percentis, explique que está usando TOP N e comparação relativa).
5) Sempre que apontar um risco ou recomendação, cite explicitamente quais módulos e quais relações (MODULO_CHAMADOR → MODULO_CHAMADO) suportam a conclusão.

Saída obrigatória (formato Markdown):
A) Resumo executivo (5–10 linhas)
   - 3 principais riscos arquiteturais observados a partir do acoplamento.
   - 3 principais oportunidades de melhoria.

B) Top dependências (Hot Links)
   - Liste as 15 relações (chamador → chamado) com maior QTDE_CHAMADA.
   - Para cada relação, comente o possível impacto: estabilidade, mudança, testes, performance e release.

C) Módulos “Hub” (Alta centralidade)
   C1) Top 10 por fan-in (mais chamados)
   - Explique por que viram gargalos/“core” e quais cuidados (contratos, versionamento, testes, SLA).
   C2) Top 10 por fan-out (mais chamam outros)
   - Explique por que viram módulos “orquestradores” e quais riscos (efeito cascata, complexidade, deploy).

D) Acoplamento bidirecional e indícios de ciclos
   - Identifique pares A ↔ B (dependência nos dois sentidos).
   - Liste os 10 pares bidirecionais mais intensos (somando as duas direções).
   - Explique o risco de ciclos: propagação de mudanças, dificuldade de refatoração, testes e modularidade.`,
        },
      },
    ],
  };
}
