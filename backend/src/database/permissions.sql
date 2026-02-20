-- Permissions System for LAN Messenger
-- Run this on PostgreSQL after init.sql

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Role permissions (many-to-many between roles and permissions)
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, role, permission_id)
);

-- Custom user permissions (override role permissions)
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    granted BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, permission_id)
);

-- Insert default permissions
INSERT INTO permissions (name, description, category) VALUES
-- Chat permissions
('chat.send', 'Send messages in conversations', 'chat'),
('chat.delete_own', 'Delete own messages', 'chat'),
('chat.delete_any', 'Delete any message (moderator)', 'chat'),
('chat.create_group', 'Create group conversations', 'chat'),
('chat.file_upload', 'Upload files in chat', 'chat'),

-- User permissions
('users.view', 'View user list', 'users'),
('users.create', 'Create new users', 'users'),
('users.edit', 'Edit user details', 'users'),
('users.delete', 'Deactivate/delete users', 'users'),
('users.change_role', 'Change user roles', 'users'),

-- Network permissions
('network.view', 'View network devices', 'network'),
('network.scan', 'Trigger network scan', 'network'),
('network.link_device', 'Link device to user', 'network'),

-- Admin permissions
('admin.access', 'Access admin panel', 'admin'),
('admin.company_settings', 'Edit company settings', 'admin'),
('admin.manage_permissions', 'Manage role permissions', 'admin'),
('admin.view_logs', 'View system logs', 'admin')
ON CONFLICT (name) DO NOTHING;

-- Default permissions for admin role
INSERT INTO role_permissions (company_id, role, permission_id)
SELECT 
    '00000000-0000-0000-0000-000000000001',
    'admin',
    id
FROM permissions
ON CONFLICT DO NOTHING;

-- Default permissions for moderator role
INSERT INTO role_permissions (company_id, role, permission_id)
SELECT 
    '00000000-0000-0000-0000-000000000001',
    'moderator',
    id
FROM permissions
WHERE name IN (
    'chat.send', 'chat.delete_own', 'chat.delete_any', 'chat.create_group', 'chat.file_upload',
    'users.view', 'network.view', 'network.scan'
)
ON CONFLICT DO NOTHING;

-- Default permissions for user role
INSERT INTO role_permissions (company_id, role, permission_id)
SELECT 
    '00000000-0000-0000-0000-000000000001',
    'user',
    id
FROM permissions
WHERE name IN (
    'chat.send', 'chat.delete_own', 'chat.create_group', 'chat.file_upload',
    'users.view', 'network.view'
)
ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_role_permissions_company ON role_permissions(company_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
