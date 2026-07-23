-- ============================================
--  RAM KINKAR SHAHI MEMORIAL FOUNDATION
--  Additional schema: Gallery + Team Members
--  (Advisory Council / Volunteers / Brand Ambassadors)
--  Run this once, AFTER schema.sql, against your database.
-- ============================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'GalleryImages')
BEGIN
  CREATE TABLE GalleryImages (
    Id            INT IDENTITY(1,1) PRIMARY KEY,
    Caption       NVARCHAR(300) NULL,
    FileName      NVARCHAR(255) NULL,     -- original uploaded filename
    FilePath      NVARCHAR(500) NOT NULL, -- relative path under /uploads
    SortOrder     INT NOT NULL DEFAULT 0,
    IsPublic      BIT NOT NULL DEFAULT 1,
    CreatedAt     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TeamMembers')
BEGIN
  CREATE TABLE TeamMembers (
    Id            INT IDENTITY(1,1) PRIMARY KEY,
    Category      NVARCHAR(30) NOT NULL,   -- 'advisory_council' | 'volunteer' | 'brand_ambassador'
    Name          NVARCHAR(150) NOT NULL,
    Role          NVARCHAR(150) NULL,      -- e.g. designation / area of work
    Bio           NVARCHAR(500) NULL,
    PhotoFileName NVARCHAR(255) NULL,
    PhotoFilePath NVARCHAR(500) NULL,      -- relative path under /uploads
    SortOrder     INT NOT NULL DEFAULT 0,
    IsPublic      BIT NOT NULL DEFAULT 1,
    CreatedAt     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END
GO

-- No seed rows — these start empty and show "No data found" on the
-- public site until the admin adds entries via the admin panel.
