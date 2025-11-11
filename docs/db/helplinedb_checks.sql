-- HelpLineDB – Quick checks and diagnostics
USE HelpLineDB;
GO

SELECT DB_NAME() AS CurrentDB;

-- Tables present
SELECT name FROM sys.tables 
WHERE name IN ('User','Role','UserRole','Ticket','TicketCategory','TicketLevel','TicketPriority','TicketStatus','TicketSequence','TicketMessage')
ORDER BY name;

-- Required defaults
SELECT 'User.Id'   AS Col, 1 AS HasDefault
WHERE EXISTS (
  SELECT 1 FROM sys.default_constraints dc
  JOIN sys.columns c ON dc.parent_object_id=c.object_id AND dc.parent_column_id=c.column_id
  WHERE OBJECT_NAME(dc.parent_object_id)='User' AND c.name='Id'
)
UNION ALL
SELECT 'Ticket.Id', 1
WHERE EXISTS (
  SELECT 1 FROM sys.default_constraints dc
  JOIN sys.columns c ON dc.parent_object_id=c.object_id AND dc.parent_column_id=c.column_id
  WHERE OBJECT_NAME(dc.parent_object_id)='Ticket' AND c.name='Id'
);

-- Ticket FKs
SELECT fk.name, OBJECT_NAME(fk.referenced_object_id) AS RefTable
FROM sys.foreign_keys fk
WHERE OBJECT_NAME(fk.parent_object_id)='Ticket';

-- Helpful indexes
SELECT i.name, t.name AS table_name
FROM sys.indexes i
JOIN sys.tables t ON t.object_id = i.object_id
WHERE i.name IN (
  'IX_Ticket_Status_CreatedAt','IX_Ticket_Assignee_Status',
  'IX_Ticket_Category_Level','IX_Ticket_CreatedAt',
  'IX_TicketMessage_Ticket_CreatedAt'
)
ORDER BY t.name, i.name;

-- Routines and views
SELECT name FROM sys.procedures WHERE name IN ('sp_Tickets_Create','sp_TicketMessages_Add','sp_Reports_Tickets');
SELECT name FROM sys.views WHERE name IN ('v_Tickets_Daily_Aggregates');

