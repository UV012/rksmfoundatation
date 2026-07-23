-- ============================================
--  RAM KINKAR SHAHI MEMORIAL FOUNDATION
--  Additional schema: Site visit counter
--  Run this once, after the other schema files.
-- ============================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SiteStats')
BEGIN
  CREATE TABLE SiteStats (
    StatKey   NVARCHAR(50) NOT NULL PRIMARY KEY,
    StatValue BIGINT NOT NULL DEFAULT 0
  );

  INSERT INTO SiteStats (StatKey, StatValue) VALUES ('total_visits', 0);
END
GO
