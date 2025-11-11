# Migração: Campo Origin (web/mobile/desktop)

Objetivo
- Unificar a base e permitir identificar a origem de Usuários e Chamados:
  - `Origin` em `dbo.[User]` e `dbo.Ticket` (valores sugeridos: `web`, `mobile`, `desktop`).
  - Atualizar a SP `dbo.sp_Tickets_Create` para aceitar `@Origin` e persistir em `Ticket.Origin`.

Pré‑requisitos
- SQL Server (HelpLineDB) acessível.
- API configurada com a mesma base (connection string `HelpLineDb`).

Arquivos de migração
- `docs/db/migrations/2025-11-11_001_add-origin.sql`
- `docs/db/migrations/2025-11-11_002_alter-sp_tickets_create.sql`

1) 2025-11-11_001_add-origin.sql
```
-- Users: coluna Origin + índice
IF COL_LENGTH('dbo.[User]', 'Origin') IS NULL
BEGIN
  ALTER TABLE dbo.[User]
    ADD Origin NVARCHAR(16) NOT NULL
      CONSTRAINT DF_User_Origin DEFAULT('web') WITH VALUES;
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_User_Origin' AND object_id=OBJECT_ID('dbo.[User]'))
BEGIN
  CREATE INDEX IX_User_Origin ON dbo.[User](Origin);
END

-- Tickets: coluna Origin + índice
IF COL_LENGTH('dbo.Ticket', 'Origin') IS NULL
BEGIN
  ALTER TABLE dbo.Ticket
    ADD Origin NVARCHAR(16) NOT NULL
      CONSTRAINT DF_Ticket_Origin DEFAULT('web') WITH VALUES;
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Ticket_Origin' AND object_id=OBJECT_ID('dbo.Ticket'))
BEGIN
  CREATE INDEX IX_Ticket_Origin ON dbo.Ticket(Origin);
END

-- (Opcional) Checks de domínio
-- ALTER TABLE dbo.[User]  ADD CONSTRAINT CK_User_Origin  CHECK (Origin IN ('web','mobile','desktop'));
-- ALTER TABLE dbo.Ticket   ADD CONSTRAINT CK_Ticket_Origin CHECK (Origin IN ('web','mobile','desktop'));
```

2) 2025-11-11_002_alter-sp_tickets_create.sql
```
CREATE OR ALTER PROCEDURE dbo.sp_Tickets_Create
    @RequesterId UNIQUEIDENTIFIER,
    @Title NVARCHAR(255),
    @Description NVARCHAR(MAX) = NULL,
    @CategoryId INT,
    @LevelId INT,
    @PriorityId INT,
    @AssigneeId UNIQUEIDENTIFIER = NULL,
    @InitialStatusId INT = NULL,
    @Origin NVARCHAR(16) = 'web'
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @Id UNIQUEIDENTIFIER = NEWID();
  DECLARE @Protocol NVARCHAR(32) = CONCAT('HL-', FORMAT(SYSUTCDATETIME(),'yyyyMMddHHmmss'), '-', RIGHT(CONVERT(VARCHAR(36), @Id), 4));

  INSERT INTO dbo.Ticket
    (Id, Protocol, Title, Description, CategoryId, LevelId, PriorityId, StatusId, RequesterId, AssigneeId, Origin, CreatedAt)
  VALUES
    (@Id, @Protocol, @Title, @Description, @CategoryId, @LevelId, @PriorityId, ISNULL(@InitialStatusId, 1), @RequesterId, @AssigneeId, @Origin, SYSUTCDATETIME());

  SELECT TicketId=@Id, Protocol=@Protocol;
END
```

Ordem de execução
1. Executar `2025-11-11_001_add-origin.sql` (adiciona colunas e índices).
2. Executar `2025-11-11_002_alter-sp_tickets_create.sql` (atualiza a SP para aceitar/persistir @Origin).

Validação rápida (SQL)
```
-- Colunas
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE (TABLE_NAME='User' OR TABLE_NAME='Ticket') AND COLUMN_NAME='Origin';

-- Amostras
SELECT TOP 10 Id, Name, Email, Origin FROM dbo.[User] ORDER BY Id DESC;
SELECT TOP 10 Id, Protocol, Origin FROM dbo.Ticket ORDER BY CreatedAt DESC;

-- SP existe e texto
SELECT OBJECT_ID('dbo.sp_Tickets_Create','P') AS SpId;
EXEC sp_helptext 'dbo.sp_Tickets_Create';
```

Roteiro de teste (Swagger) – 5 minutos
1) Criar Analyst (origin=web)
```
POST /auth/register
{
  "name": "Ana Analyst",
  "email": "ana.analyst@coremind.local",
  "password": "Senha@123",
  "role": "Analyst",
  "inviteToken": "SUPORTE4280",
  "origin": "web"
}

POST /auth/login
{
  "email": "ana.analyst@coremind.local",
  "password": "Senha@123"
}
```
Authorize no Swagger com o token do analyst.

2) Criar User (origin=mobile)
```
POST /auth/register
{
  "name": "Carlos Silva",
  "email": "carlos.silva@coremind.local",
  "password": "Senha@123",
  "role": "User",
  "origin": "mobile"
}

POST /auth/login
{
  "email": "carlos.silva@coremind.local",
  "password": "Senha@123"
}
```
Guarde o `userId` do login.

3) Criar chamado (origin=mobile)
```
POST /tickets
{
  "requesterId": "<userId do Carlos>",
  "title": "VPN não conecta no notebook",
  "description": "Erro 619 ao tentar conectar.",
  "categoryId": 3,
  "levelId": 2,
  "priorityId": 3,
  "assigneeId": null,
  "initialStatusId": null,
  "origin": "mobile"
}
```

4) Listar por origem (Analyst)
```
GET /tickets?origin=mobile&page=1&pageSize=20
```

5) Relatórios por origem (Analyst)
```
GET /reports?origin=mobile&from=YYYY-MM-DD&to=YYYY-MM-DD
```

6) Meus chamados (User)
```
GET /tickets/mine?page=1&pageSize=20
```

Notas
- Mobile já envia `origin: 'mobile'` no registro e criação de chamado.
- Web Admin deve enviar `origin: 'web'` no registro.
- Futuro Desktop: `origin: 'desktop'`.
- LGPD: endpoints administrativos exigem roles; dados pessoais exibidos apenas para fins de suporte.

Rollback (se necessário)
- Remover colunas pode causar perda de dados; evite em produção.
- Para remover apenas o suporte lógico, reverta o codebase para ignorar `Origin`.
- Para desfazer a SP: restaure a versão anterior com `CREATE OR ALTER PROCEDURE` sem `@Origin` (não recomendado após dados gravados).

