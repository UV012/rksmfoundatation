-- ============================================
--  RAM KINKAR SHAHI MEMORIAL FOUNDATION
--  MSSQL schema: Admin users + Legal Registrations
--  Run this once against your database.
-- ============================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AdminUsers')
BEGIN
  CREATE TABLE AdminUsers (
    Id            INT IDENTITY(1,1) PRIMARY KEY,
    Username      NVARCHAR(100) NOT NULL UNIQUE,
    PasswordHash  NVARCHAR(255) NOT NULL,   -- bcrypt hash
    CreatedAt     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    LastLoginAt   DATETIME2 NULL
  );
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LegalRegistrations')
BEGIN
  CREATE TABLE LegalRegistrations (
    Id            NVARCHAR(20)  NOT NULL PRIMARY KEY,   -- 'trust' | '12ab' | '80g'
    Icon          NVARCHAR(10)  NULL,
    Title         NVARCHAR(200) NOT NULL,
    Description   NVARCHAR(1000) NULL,
    RegNumber     NVARCHAR(100) NULL,
    RegDate       DATE NULL,
    Validity      NVARCHAR(200) NULL,
    FileName      NVARCHAR(255) NULL,        -- original uploaded filename
    FilePath      NVARCHAR(500) NULL,        -- relative path under /uploads
    IsPublic      BIT NOT NULL DEFAULT 1,
    UpdatedAt     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );

  -- Seed the three fixed registration rows (edited later via admin panel)
  INSERT INTO LegalRegistrations (Id, Icon, Title, Description, RegNumber, RegDate, Validity, IsPublic)
  VALUES
  ('trust', N'⚖️', N'Trust / Society Registration Certificate',
    N'Confirms the Foundation''s legal existence as a registered Section 8 not-for-profit company under the Companies Act, 2013.',
    N'U85420BR2026NPL085486', NULL, N'No expiry', 1),
  ('12ab', N'📜', N'12AB Registration Certificate',
    N'Registration under Section 12AB of the Income Tax Act, 1961, recognising the Foundation as a charitable entity and exempting its income when applied to charitable objects.',
    NULL, NULL, NULL, 1),
  ('80g', N'🧾', N'80G Registration Certificate',
    N'Registration under Section 80G of the Income Tax Act, 1961, enabling donors to claim a tax deduction on eligible donations made to the Foundation.',
    NULL, NULL, NULL, 1);
END
GO

-- To create your first admin user, generate a bcrypt hash (see backend/create-admin.js)
-- and insert it manually, e.g.:
-- INSERT INTO AdminUsers (Username, PasswordHash) VALUES ('admin', '$2b$10$...');
