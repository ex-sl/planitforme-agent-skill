# PlanItForMe Agent Skill

Навык для работы Codex с личным пространством PlanItForMe через ограниченный
MCP-интерфейс. Он читает текущие возможности сервера, использует устойчивые
ссылки на дела и применяет изменения только после отдельного предварительного
просмотра и подтверждения.

## Установка

Клонируйте репозиторий как каталог навыка Codex:

```bash
git clone git@github.com:ex-sl/planitforme-agent-skill.git \
  ~/.codex/skills/planitforme-agent
```

После этого настройте транспорт по инструкции
[references/codex-connection.md](references/codex-connection.md) и перезапустите
Codex. В новой задаче можно написать:

```text
Используй $planitforme-agent и покажи мой план на сегодня.
```

Репозиторий не содержит данные доступа к PlanItForMe. Они остаются только в
локальной настройке MCP-сервера.
