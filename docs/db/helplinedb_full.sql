-- HelpLineDB – Full creation script (idempotent where possible)
-- Run in SSMS. Execute blocks separated by GO. Adjust passwords safely.

/* 1) Create database */
IF DB_ID(N'HelpLineDB') IS NULL
BEGIN
  CREATE DATABASE HelpLineDB;
END
GO

/* 10) FAQ (knowledge base) */
IF OBJECT_ID('dbo.Faq','U') IS NULL
BEGIN
  CREATE TABLE dbo.Faq(
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Faq_Id DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    Title NVARCHAR(200) NOT NULL,
    Category NVARCHAR(50) NOT NULL,
    Content NVARCHAR(MAX) NOT NULL,
    Tags NVARCHAR(400) NULL,
    LastUpdated DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
  );
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Faq_Category_LastUpdated' AND object_id=OBJECT_ID('dbo.Faq'))
  CREATE INDEX IX_Faq_Category_LastUpdated ON dbo.Faq(Category, LastUpdated DESC);

-- Seeds (safe to run once)
IF NOT EXISTS (SELECT 1 FROM dbo.Faq)
BEGIN
  INSERT dbo.Faq(Title,Category,Content,Tags)
  VALUES
  (N'Como redefinir senha de rede/AD', N'Acesso',
   N'Passos para redefinir sua senha:
1) Pressione Ctrl+Alt+Del e escolha "Alterar uma senha".
2) Informe a senha atual e a nova senha (mínimo 8 caracteres com letras e números).
3) Reinicie a sessão. Se falhar, verifique bloqueio e expiração.',
   N'senha,login,bloqueio'),
  (N'Sem internet no Wi‑Fi', N'Rede',
   N'Diagnóstico rápido:
1) Verifique se o Wi‑Fi está ativo.
2) Reinicie o roteador (home office).
3) Esqueça a rede e reconecte.
4) Teste em outra rede. Informe SSID/erro exibido se persistir.',
   N'wifi,rede,vpn'),
  (N'Windows lento ou travando', N'Software',
   N'Sugerimos:
1) Reiniciar o equipamento.
2) Verificar CPU/Memória/Disco (Ctrl+Shift+Esc).
3) Desativar inicialização de apps não essenciais.
4) Concluir atualizações pendentes.',
   N'windows,desempenho'),
  (N'Impressora não imprime', N'Hardware',
   N'Cheque:
1) Cabos/energia.
2) Fila de impressão pausada.
3) Drivers instalados.
4) Teste com outra impressora. Informe modelo/erro exibido.',
   N'impressora,hardware');
END
GO

/* 11) FAQ feedback (helpful votes) */
IF OBJECT_ID('dbo.FaqFeedback','U') IS NULL
BEGIN
  CREATE TABLE dbo.FaqFeedback(
    Id BIGINT IDENTITY(1,1) PRIMARY KEY,
    FaqId UNIQUEIDENTIFIER NOT NULL,
    UserId UNIQUEIDENTIFIER NOT NULL,
    Helpful BIT NOT NULL,
    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_FaqFeedback_Faq  FOREIGN KEY (FaqId)  REFERENCES dbo.Faq(Id),
    CONSTRAINT FK_FaqFeedback_User FOREIGN KEY (UserId) REFERENCES dbo.[User](Id),
    CONSTRAINT UQ_FaqFeedback_Faq_User UNIQUE (FaqId, UserId)
  );
END
GO

USE HelpLineDB;
GO

/* 2) Lookups */
IF OBJECT_ID('dbo.Role','U') IS NULL
  CREATE TABLE dbo.Role (Id INT IDENTITY(1,1) PRIMARY KEY, Name NVARCHAR(50) NOT NULL UNIQUE);
IF NOT EXISTS (SELECT 1 FROM dbo.Role)
  INSERT dbo.Role(Name) VALUES (N'Admin'),(N'Analyst'),(N'User');

IF OBJECT_ID('dbo.TicketStatus','U') IS NULL
BEGIN
  CREATE TABLE dbo.TicketStatus (Id INT IDENTITY(1,1) PRIMARY KEY, Name NVARCHAR(50) NOT NULL UNIQUE);
  INSERT dbo.TicketStatus(Name) VALUES (N'Aberto'),(N'Em andamento'),(N'Resolvido'),(N'Fechado');
END

IF OBJECT_ID('dbo.TicketPriority','U') IS NULL
BEGIN
  CREATE TABLE dbo.TicketPriority (Id INT IDENTITY(1,1) PRIMARY KEY, Name NVARCHAR(50) NOT NULL UNIQUE);
  INSERT dbo.TicketPriority(Name) VALUES (N'Baixa'),(N'Média'),(N'Alta'),(N'Crítica');
END

IF OBJECT_ID('dbo.TicketCategory','U') IS NULL
BEGIN
  CREATE TABLE dbo.TicketCategory (Id INT IDENTITY(1,1) PRIMARY KEY, Name NVARCHAR(80) NOT NULL UNIQUE);
  INSERT dbo.TicketCategory(Name) VALUES (N'Hardware'),(N'Software'),(N'Rede'),(N'Sistema Operacional'),(N'Acesso/Security'),(N'Outros');
END

IF OBJECT_ID('dbo.TicketLevel','U') IS NULL
BEGIN
  CREATE TABLE dbo.TicketLevel (Id INT IDENTITY(1,1) PRIMARY KEY, Name NVARCHAR(10) NOT NULL UNIQUE);
  INSERT dbo.TicketLevel(Name) VALUES (N'N1'),(N'N2'),(N'N3');
END
GO

/* 3) Users and roles link */
IF OBJECT_ID('dbo.[User]','U') IS NULL
BEGIN
  CREATE TABLE dbo.[User](
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_User_Id DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    Name NVARCHAR(120) NOT NULL,
    Email NVARCHAR(255) NOT NULL CONSTRAINT UQ_User_Email UNIQUE,
    PasswordHash VARBINARY(64) NULL,
    PasswordSalt VARBINARY(64) NULL,
    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
  );
END

IF OBJECT_ID('dbo.UserRole','U') IS NULL
BEGIN
  CREATE TABLE dbo.UserRole(
    UserId UNIQUEIDENTIFIER NOT NULL,
    RoleId INT NOT NULL,
    CONSTRAINT PK_UserRole PRIMARY KEY (UserId, RoleId),
    CONSTRAINT FK_UserRole_User FOREIGN KEY (UserId) REFERENCES dbo.[User](Id),
    CONSTRAINT FK_UserRole_Role FOREIGN KEY (RoleId) REFERENCES dbo.Role(Id)
  );
END
GO

/* 4) Tickets, messages, sequence */
IF OBJECT_ID('dbo.Ticket','U') IS NULL
BEGIN
  CREATE TABLE dbo.Ticket(
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Ticket_Id DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    Protocol NVARCHAR(32) NOT NULL CONSTRAINT UQ_Ticket_Protocol UNIQUE,
    Title NVARCHAR(255) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    CategoryId INT NOT NULL,
    LevelId INT NOT NULL,
    PriorityId INT NOT NULL,
    StatusId INT NOT NULL,
    RequesterId UNIQUEIDENTIFIER NOT NULL,
    AssigneeId UNIQUEIDENTIFIER NULL,
    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Ticket_Category  FOREIGN KEY (CategoryId)  REFERENCES dbo.TicketCategory(Id),
    CONSTRAINT FK_Ticket_Level     FOREIGN KEY (LevelId)     REFERENCES dbo.TicketLevel(Id),
    CONSTRAINT FK_Ticket_Priority  FOREIGN KEY (PriorityId)  REFERENCES dbo.TicketPriority(Id),
    CONSTRAINT FK_Ticket_Status    FOREIGN KEY (StatusId)    REFERENCES dbo.TicketStatus(Id),
    CONSTRAINT FK_Ticket_Requester FOREIGN KEY (RequesterId) REFERENCES dbo.[User](Id),
    CONSTRAINT FK_Ticket_Assignee  FOREIGN KEY (AssigneeId)  REFERENCES dbo.[User](Id)
  );
END

IF OBJECT_ID('dbo.TicketMessage','U') IS NULL
BEGIN
  CREATE TABLE dbo.TicketMessage(
    Id BIGINT IDENTITY(1,1) PRIMARY KEY,
    TicketId UNIQUEIDENTIFIER NOT NULL,
    SenderType NVARCHAR(16) NOT NULL, -- 'user' | 'analyst' | 'bot' | 'sistema'
    SenderUserId UNIQUEIDENTIFIER NULL,
    Content NVARCHAR(MAX) NOT NULL,
    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_TicketMessage_Ticket     FOREIGN KEY (TicketId)     REFERENCES dbo.Ticket(Id),
    CONSTRAINT FK_TicketMessage_SenderUser FOREIGN KEY (SenderUserId) REFERENCES dbo.[User](Id),
    CONSTRAINT CK_TicketMessage_SenderType CHECK (SenderType IN (N'user',N'analyst',N'bot',N'sistema'))
  );
END

IF OBJECT_ID('dbo.TicketSequence','U') IS NULL
BEGIN
  CREATE TABLE dbo.TicketSequence(
    SequenceDate DATE NOT NULL CONSTRAINT PK_TicketSequence PRIMARY KEY,
    LastNumber INT NOT NULL
  );
END
GO

/* 5) Indexes */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Ticket_Status_CreatedAt')
  CREATE INDEX IX_Ticket_Status_CreatedAt ON dbo.Ticket (StatusId, CreatedAt DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Ticket_Assignee_Status')
  CREATE INDEX IX_Ticket_Assignee_Status ON dbo.Ticket (AssigneeId, StatusId) WHERE AssigneeId IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Ticket_Category_Level')
  CREATE INDEX IX_Ticket_Category_Level ON dbo.Ticket (CategoryId, LevelId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Ticket_CreatedAt')
  CREATE INDEX IX_Ticket_CreatedAt ON dbo.Ticket (CreatedAt DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_TicketMessage_Ticket_CreatedAt')
  CREATE INDEX IX_TicketMessage_Ticket_CreatedAt ON dbo.TicketMessage (TicketId, CreatedAt);
GO

/* 6) Procedures */
IF OBJECT_ID('dbo.sp_Tickets_Create','P') IS NOT NULL DROP PROCEDURE dbo.sp_Tickets_Create;
GO
CREATE PROCEDURE dbo.sp_Tickets_Create
  @RequesterId UNIQUEIDENTIFIER,
  @Title NVARCHAR(255),
  @Description NVARCHAR(MAX) = NULL,
  @CategoryId INT,
  @LevelId INT,
  @PriorityId INT,
  @AssigneeId UNIQUEIDENTIFIER = NULL,
  @InitialStatusId INT = NULL
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @today DATE = CAST(SYSDATETIME() AS DATE);
  DECLARE @seq INT, @protocol NVARCHAR(32);
  DECLARE @statusId INT = ISNULL(@InitialStatusId, (SELECT Id FROM dbo.TicketStatus WHERE Name=N'Aberto'));

  BEGIN TRAN;
  UPDATE s WITH (UPDLOCK, HOLDLOCK) SET s.LastNumber = s.LastNumber + 1
    FROM dbo.TicketSequence s WHERE s.SequenceDate=@today;
  IF @@ROWCOUNT=0
  BEGIN
    INSERT dbo.TicketSequence(SequenceDate, LastNumber) VALUES(@today,1);
    SET @seq = 1;
  END
  ELSE
    SELECT @seq = LastNumber FROM dbo.TicketSequence WITH (HOLDLOCK) WHERE SequenceDate=@today;

  SET @protocol = N'HL-' + CONVERT(CHAR(8), @today, 112) + N'-' + RIGHT(N'000' + CAST(@seq AS NVARCHAR(10)), 3);

  DECLARE @out TABLE (Id UNIQUEIDENTIFIER);
  INSERT dbo.Ticket (Protocol, Title, Description, CategoryId, LevelId, PriorityId, StatusId, RequesterId, AssigneeId)
  OUTPUT inserted.Id INTO @out(Id)
  VALUES (@protocol, @Title, @Description, @CategoryId, @LevelId, @PriorityId, @statusId, @RequesterId, @AssigneeId);

  DECLARE @ticketId UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM @out);
  COMMIT;

  SELECT @ticketId AS TicketId, @protocol AS Protocol;
END
GO

IF OBJECT_ID('dbo.sp_TicketMessages_Add','P') IS NOT NULL DROP PROCEDURE dbo.sp_TicketMessages_Add;
GO
CREATE PROCEDURE dbo.sp_TicketMessages_Add
  @TicketId UNIQUEIDENTIFIER,
  @SenderType NVARCHAR(16),
  @SenderUserId UNIQUEIDENTIFIER = NULL,
  @Content NVARCHAR(MAX)
AS
BEGIN
  SET NOCOUNT ON;
  INSERT dbo.TicketMessage (TicketId, SenderType, SenderUserId, Content)
  VALUES (@TicketId, @SenderType, @SenderUserId, @Content);
  SELECT SCOPE_IDENTITY() AS MessageId;
END
GO

IF OBJECT_ID('dbo.sp_Reports_Tickets','P') IS NOT NULL DROP PROCEDURE dbo.sp_Reports_Tickets;
GO
CREATE PROCEDURE dbo.sp_Reports_Tickets
  @From DATE = NULL,
  @To DATE = NULL,
  @Status NVARCHAR(50) = NULL,
  @Categoria NVARCHAR(80) = NULL,
  @Nivel NVARCHAR(10) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SELECT
    CAST(t.CreatedAt AS DATE) AS Dia,
    s.Name AS Status,
    c.Name AS Categoria,
    l.Name AS Nivel,
    p.Name AS Prioridade,
    COUNT_BIG(*) AS Qtde
  FROM dbo.Ticket t
  JOIN dbo.TicketStatus  s ON s.Id = t.StatusId
  JOIN dbo.TicketCategory c ON c.Id = t.CategoryId
  JOIN dbo.TicketLevel    l ON l.Id = t.LevelId
  JOIN dbo.TicketPriority p ON p.Id = t.PriorityId
  WHERE (@From IS NULL OR CAST(t.CreatedAt AS DATE) >= @From)
    AND (@To   IS NULL OR CAST(t.CreatedAt AS DATE) <= @To)
    AND (@Status    IS NULL OR s.Name = @Status)
    AND (@Categoria IS NULL OR c.Name = @Categoria)
    AND (@Nivel     IS NULL OR l.Name = @Nivel)
  GROUP BY CAST(t.CreatedAt AS DATE), s.Name, c.Name, l.Name, p.Name
  ORDER BY Dia DESC, Qtde DESC;
END
GO

/* 7) View */
IF OBJECT_ID('dbo.v_Tickets_Daily_Aggregates','V') IS NOT NULL
  DROP VIEW dbo.v_Tickets_Daily_Aggregates;
GO
CREATE VIEW dbo.v_Tickets_Daily_Aggregates
AS
SELECT
  CAST(t.CreatedAt AS DATE) AS Dia,
  s.Name AS Status,
  c.Name AS Categoria,
  l.Name AS Nivel,
  p.Name AS Prioridade,
  COUNT_BIG(*) AS Qtde
FROM dbo.Ticket t
JOIN dbo.TicketStatus  s ON s.Id = t.StatusId
JOIN dbo.TicketCategory c ON c.Id = t.CategoryId
JOIN dbo.TicketLevel    l ON l.Id = t.LevelId
JOIN dbo.TicketPriority p ON p.Id = t.PriorityId
GROUP BY CAST(t.CreatedAt AS DATE), s.Name, c.Name, l.Name, p.Name;
GO

/* 8) Optional: application login/user and grants (adjust password!) */
-- CREATE LOGIN helpline_app WITH PASSWORD = 'TroqueEstaSenha!2025', CHECK_POLICY=ON, CHECK_EXPIRATION=ON;
-- GO
-- USE HelpLineDB;
-- GO
-- CREATE USER helpline_app FOR LOGIN helpline_app;
-- CREATE ROLE helpline_role AUTHORIZATION dbo;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[User]        TO helpline_role;
-- GRANT SELECT, INSERT, UPDATE           ON dbo.UserRole    TO helpline_role;
-- GRANT SELECT, INSERT, UPDATE, DELETE   ON dbo.Ticket      TO helpline_role;
-- GRANT SELECT, INSERT                   ON dbo.TicketMessage TO helpline_role;
-- GRANT SELECT ON dbo.Role, dbo.TicketStatus, dbo.TicketPriority, dbo.TicketCategory, dbo.TicketLevel TO helpline_role;
-- GRANT SELECT ON dbo.v_Tickets_Daily_Aggregates TO helpline_role;
-- GRANT EXECUTE ON dbo.sp_Tickets_Create, dbo.sp_TicketMessages_Add, dbo.sp_Reports_Tickets TO helpline_role;
-- EXEC sp_addrolemember 'helpline_role', 'helpline_app';
-- GO

/* 9) Smoke tests (optional) */
-- USE HelpLineDB; GO
-- IF NOT EXISTS (SELECT 1 FROM dbo.[User] WHERE Email=N'admin@helpline.local')
--   INSERT dbo.[User](Name, Email) VALUES (N'Admin', N'admin@helpline.local');
-- DECLARE @req UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM dbo.[User] WHERE Email=N'admin@helpline.local');
-- DECLARE @CategoryId INT = (SELECT Id FROM dbo.TicketCategory WHERE Name=N'Software');
-- DECLARE @LevelId    INT = (SELECT Id FROM dbo.TicketLevel    WHERE Name=N'N1');
-- DECLARE @PriorityId INT = (SELECT Id FROM dbo.TicketPriority WHERE Name=N'Baixa');
-- EXEC dbo.sp_Tickets_Create @RequesterId=@req, @Title=N'Teste protocolo', @Description=N'Teste', @CategoryId=@CategoryId, @LevelId=@LevelId, @PriorityId=@PriorityId, @AssigneeId=NULL, @InitialStatusId=NULL;
-- SELECT TOP 1 Id, Protocol FROM dbo.Ticket ORDER BY CreatedAt DESC;
-- DECLARE @t UNIQUEIDENTIFIER = (SELECT TOP 1 Id FROM dbo.Ticket ORDER BY CreatedAt DESC);
-- EXEC dbo.sp_TicketMessages_Add @TicketId=@t, @SenderType=N'bot', @SenderUserId=NULL, @Content=N'Msg test';
-- DECLARE @from DATE = DATEADD(day,-7,CAST(GETDATE() AS date)); DECLARE @to DATE = CAST(GETDATE() AS date);
-- EXEC dbo.sp_Reports_Tickets @From=@from, @To=@to;
