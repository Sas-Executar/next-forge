# Blueprint integration

## Regra de entrada

Nenhum pacote P0 deve entrar em implementação sem requisito, critério de aceite, target, plano de teste, rastreabilidade e rollback ou justificativa de não aplicabilidade.

## Fluxo

`Governance → Blueprints → Development Packet → Ecosystem → Test → Verify → Release`

Blueprint define **WHAT**. Ecosystem implementa **HOW**.

## Estado atual

- Blueprints possui estrutura de revisão em branches de migração.
- Product-Spec foi copiado com hashes em branch de revisão, mas continua bloqueado por visibilidade pública do destino e por PRs empilhadas.
- Nenhuma cópia de contrato deve ser tratada como implementação sem PR, testes e validação própria neste repositório.
