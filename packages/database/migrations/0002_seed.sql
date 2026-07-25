INSERT INTO permissions(key, description) VALUES
 ('*','Acesso integral'),
 ('admin.access','Acessar o painel administrativo'),
 ('users.read','Consultar usuários'),('users.write','Gerenciar usuários'),
 ('roles.read','Consultar papéis'),('roles.write','Gerenciar papéis e permissões'),
 ('categories.read','Consultar categorias'),('categories.write','Gerenciar categorias'),
 ('modules.read','Consultar módulos'),('modules.write','Criar e atualizar módulos'),('modules.activate','Ativar, desativar e restaurar módulos'),
 ('landing.read','Consultar a landing'),('landing.write','Editar e publicar a landing'),
 ('company.read','Consultar dados da empresa'),('company.write','Alterar dados da empresa'),
 ('system.read','Consultar o sistema'),('system.write','Alterar configurações do sistema'),
 ('audit.read','Consultar auditoria'),('backups.run','Executar backups'),('security.manage','Gerenciar segurança')
ON CONFLICT (key) DO NOTHING;

INSERT INTO roles(key,name,description,is_system,is_owner) VALUES
 ('owner','Proprietário','Controle integral da instalação',true,true),
 ('super-admin','Super Admin','Administração integral sem remover o último proprietário',true,false),
 ('manager','Gerenciador','Acesso administrativo limitado',true,false),
 ('user','Usuário','Acesso comum ao aplicativo',true,false)
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.key IN ('owner','super-admin')
ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r JOIN permissions p ON p.key IN ('admin.access','users.read','categories.read','modules.read','landing.read','company.read','system.read') WHERE r.key='manager'
ON CONFLICT DO NOTHING;

INSERT INTO landing_sections(type,name,enabled,sort_order,content) VALUES
 ('header','Cabeçalho',true,10,'{"logoText":"EasySaaS","links":[{"label":"Funcionalidades","href":"#funcionalidades"},{"label":"Benefícios","href":"#beneficios"}],"button":{"label":"Entrar","href":"/login"}}'),
 ('hero','Apresentação principal',true,20,'{"eyebrow":"Base empresarial modular","title":"Uma aplicação organizada para a sua empresa","description":"Centralize acesso, módulos, usuários e configurações em uma instalação própria.","primary":{"label":"Acessar sistema","href":"/login"},"secondary":{"label":"Conhecer recursos","href":"#funcionalidades"}}'),
 ('features','Funcionalidades',true,30,'{"title":"Funcionalidades","description":"Os módulos ativos podem ser apresentados automaticamente.","mode":"automatic","items":[]}'),
 ('benefits','Benefícios',true,40,'{"title":"Estrutura simples e segura","items":[{"title":"Instalação exclusiva","description":"Banco, arquivos e configurações pertencem somente à empresa."},{"title":"Controle administrativo","description":"Usuários, permissões, landing e módulos em um único painel."},{"title":"Arquitetura modular","description":"Novas funcionalidades entram sem alterar o núcleo protegido."}]}'),
 ('cta','Chamada final',true,50,'{"title":"Acesse sua área empresarial","description":"Entre com a conta autorizada pela administração.","button":{"label":"Entrar","href":"/login"}}'),
 ('footer','Rodapé',true,60,'{"description":"Sistema empresarial privado.","links":[{"label":"Privacidade","href":"/privacy"},{"label":"Termos","href":"/terms"}],"copyright":"© {{year}} EasySaaS"}')
ON CONFLICT DO NOTHING;
