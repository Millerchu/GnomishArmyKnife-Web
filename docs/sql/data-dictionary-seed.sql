begin;

create temporary table seed_dictionaries (
  id bigint primary key,
  dict_code varchar(64) not null,
  dict_name varchar(64) not null,
  status varchar(20) not null,
  reference_apps_json text,
  description varchar(255),
  creator_user_id bigint,
  creator_name varchar(64)
) on commit drop;

insert into seed_dictionaries (
  id, dict_code, dict_name, status, reference_apps_json, description, creator_user_id, creator_name
) values
  (5001, 'USER_ROLE_TYPE', '用户角色类型', 'ENABLED', '["用户管理","注册"]', '用户角色下拉选项', 900000000000000001, '系统管理员'),
  (5002, 'USER_STATUS', '用户状态', 'ENABLED', '["用户管理","注册"]', '用户状态选项', 900000000000000001, '系统管理员'),
  (5003, 'WORK_LOG_TYPE', '工作日志类型', 'ENABLED', '["工作日志"]', '工作日志类型选项', 900000000000000001, '系统管理员'),
  (5004, 'WORK_LOG_PROJECT', '工作日志项目', 'ENABLED', '["工作日志"]', '工作日志项目选项', 900000000000000001, '系统管理员'),
  (5005, 'APP_SECURITY_LEVEL', '应用密级', 'ENABLED', '["应用管理","权限管理"]', '应用密级选项', 900000000000000001, '系统管理员'),
  (5006, 'APP_ENCRYPTION_MODE', '应用加密方式', 'ENABLED', '["应用管理","权限管理"]', '应用加密方式选项', 900000000000000001, '系统管理员'),
  (6001, 'TODO_LIST_CODE', '待办清单类型', 'ENABLED', '["待办列表"]', '待办列表清单类型选项', 900000000000000001, '系统管理员'),
  (6002, 'TODO_STATUS', '待办状态', 'ENABLED', '["待办列表"]', '待办任务状态选项', 900000000000000001, '系统管理员'),
  (6003, 'TODO_IMPORTANCE', '待办优先级', 'ENABLED', '["待办列表"]', '待办任务优先级选项', 900000000000000001, '系统管理员'),
  (6004, 'APP_DATA_SOURCE_MODE', '应用数据来源', 'ENABLED', '["应用管理"]', '应用数据来源模式', 900000000000000001, '系统管理员'),
  (6005, 'APP_STATUS', '应用状态', 'ENABLED', '["应用管理","权限管理"]', '应用启停状态选项', 900000000000000001, '系统管理员'),
  (6006, 'APP_ICON_TYPE', '应用图标类型', 'ENABLED', '["应用管理"]', '应用图标来源类型', 900000000000000001, '系统管理员'),
  (6007, 'APP_CATEGORY', '应用分类', 'ENABLED', '["应用管理","主页"]', '应用分类建议值', 900000000000000001, '系统管理员'),
  (6008, 'KNOWLEDGE_CATEGORY', '经验分类', 'ENABLED', '["经验库"]', '经验库分类选项', 900000000000000001, '系统管理员'),
  (6009, 'SOFTWARE_PLATFORM', '软件平台', 'ENABLED', '["软件仓库"]', '软件平台选项', 900000000000000001, '系统管理员'),
  (6010, 'SOFTWARE_RELEASE_CHANNEL', '软件发布渠道', 'ENABLED', '["软件仓库"]', '软件版本发布渠道选项', 900000000000000001, '系统管理员'),
  (6011, 'FUEL_TYPE', '油品类型', 'ENABLED', '["油耗统计"]', '加油油品类型选项', 900000000000000001, '系统管理员'),
  (6012, 'FUEL_FILL_TYPE', '加油方式', 'ENABLED', '["油耗统计"]', '加油方式选项', 900000000000000001, '系统管理员'),
  (6013, 'WOW_FACTION', '魔兽阵营', 'ENABLED', '["WoW角色统计"]', 'WoW 阵营选项', 900000000000000001, '系统管理员'),
  (6014, 'WOW_CLASS_NAME', '魔兽职业', 'ENABLED', '["WoW角色统计"]', 'WoW 职业选项', 900000000000000001, '系统管理员'),
  (6015, 'WOW_MYTHIC_DUNGEON', '大秘境副本', 'ENABLED', '["WoW角色统计"]', 'WoW 大秘境副本选项', 900000000000000001, '系统管理员'),
  (6016, 'PERSONAL_BILL_TYPE', '账单类型', 'ENABLED', '["个人账单"]', '个人账单收支类型', 900000000000000001, '系统管理员'),
  (6017, 'SOFTWARE_CATEGORY', '软件分类', 'ENABLED', '["软件仓库"]', '软件仓库分类建议值', 900000000000000001, '系统管理员');

insert into gak_data_dictionary (
  id, dict_code, dict_name, status, reference_apps_json, description, creator_user_id, creator_name, created_at, updated_at, deleted
)
select
  id, dict_code, dict_name, status, reference_apps_json, description, creator_user_id, creator_name, now(), now(), false
from seed_dictionaries
on conflict (id) do update
set dict_code = excluded.dict_code,
    dict_name = excluded.dict_name,
    status = excluded.status,
    reference_apps_json = excluded.reference_apps_json,
    description = excluded.description,
    creator_user_id = excluded.creator_user_id,
    creator_name = excluded.creator_name,
    updated_at = now(),
    deleted = false;

create temporary table seed_dictionary_items (
  id bigint primary key,
  dictionary_id bigint not null,
  dict_code varchar(64) not null,
  item_code varchar(64) not null,
  item_label varchar(64) not null,
  item_value varchar(64) not null,
  sort_no integer not null,
  status varchar(20) not null,
  is_default boolean not null,
  description varchar(255),
  extra_json text
) on commit drop;

insert into seed_dictionary_items (
  id, dictionary_id, dict_code, item_code, item_label, item_value, sort_no, status, is_default, description, extra_json
) values
  (5001001, 5001, 'USER_ROLE_TYPE', 'admin', '系统管理员', 'ADMIN', 1, 'ENABLED', false, '系统管理员角色', null),
  (5001002, 5001, 'USER_ROLE_TYPE', 'dev', '开发人员', 'DEV', 2, 'ENABLED', false, '开发账户角色', null),
  (5001003, 5001, 'USER_ROLE_TYPE', 'user', '普通用户', 'USER', 3, 'ENABLED', true, '默认注册角色', null),

  (5002001, 5002, 'USER_STATUS', 'enabled', '启用', 'ENABLED', 1, 'ENABLED', true, '启用状态', null),
  (5002002, 5002, 'USER_STATUS', 'disabled', '禁用', 'DISABLED', 2, 'ENABLED', false, '禁用状态', null),

  (5003001, 5003, 'WORK_LOG_TYPE', 'normal', '正常工作', 'NORMAL', 1, 'ENABLED', true, '正常工作记录', null),
  (5003002, 5003, 'WORK_LOG_TYPE', 'leave', '请假', 'LEAVE', 2, 'ENABLED', false, '请假记录', null),
  (5003003, 5003, 'WORK_LOG_TYPE', 'business_trip', '出差', 'BUSINESS_TRIP', 3, 'ENABLED', false, '出差记录', null),
  (5003004, 5003, 'WORK_LOG_TYPE', 'sick_leave', '病假', 'SICK_LEAVE', 4, 'ENABLED', false, '病假记录', null),
  (5003005, 5003, 'WORK_LOG_TYPE', 'other', '其他', 'OTHER', 5, 'ENABLED', false, '其他类型', null),

  (5004001, 5004, 'WORK_LOG_PROJECT', 'gak', 'GAK', 'GAK', 1, 'ENABLED', true, '当前主工程', null),
  (5004002, 5004, 'WORK_LOG_PROJECT', 'client', '客户项目', 'CLIENT', 2, 'ENABLED', false, '客户交付项目', null),
  (5004003, 5004, 'WORK_LOG_PROJECT', 'ops', '运维支持', 'OPS', 3, 'ENABLED', false, '运维支持类事项', null),

  (5005001, 5005, 'APP_SECURITY_LEVEL', 'public', '公开', 'PUBLIC', 1, 'ENABLED', false, '公开级应用', null),
  (5005002, 5005, 'APP_SECURITY_LEVEL', 'internal', '内部', 'INTERNAL', 2, 'ENABLED', true, '内部级应用', null),
  (5005003, 5005, 'APP_SECURITY_LEVEL', 'confidential', '受限', 'CONFIDENTIAL', 3, 'ENABLED', false, '受限级应用', null),

  (5006001, 5006, 'APP_ENCRYPTION_MODE', 'none', '无额外加密', 'NONE', 1, 'ENABLED', true, '普通明文存储', null),
  (5006002, 5006, 'APP_ENCRYPTION_MODE', 'field', '字段加密', 'FIELD', 2, 'ENABLED', false, '字段级加密', null),
  (5006003, 5006, 'APP_ENCRYPTION_MODE', 'end_to_end', '端到端加密', 'END_TO_END', 3, 'ENABLED', false, '端到端加密', null),

  (6001001, 6001, 'TODO_LIST_CODE', 'my_day', '我的一天', 'MY_DAY', 1, 'ENABLED', true, '默认待办清单', null),
  (6001002, 6001, 'TODO_LIST_CODE', 'work', '工作', 'WORK', 2, 'ENABLED', false, '工作清单', null),
  (6001003, 6001, 'TODO_LIST_CODE', 'personal', '个人', 'PERSONAL', 3, 'ENABLED', false, '个人清单', null),
  (6001004, 6001, 'TODO_LIST_CODE', 'learning', '学习', 'LEARNING', 4, 'ENABLED', false, '学习清单', null),
  (6001005, 6001, 'TODO_LIST_CODE', 'shopping', '购物', 'SHOPPING', 5, 'ENABLED', false, '购物清单', null),

  (6002001, 6002, 'TODO_STATUS', 'todo', '待开始', 'TODO', 1, 'ENABLED', true, '未开始状态', null),
  (6002002, 6002, 'TODO_STATUS', 'in_progress', '进行中', 'IN_PROGRESS', 2, 'ENABLED', false, '进行中状态', null),
  (6002003, 6002, 'TODO_STATUS', 'completed', '已完成', 'COMPLETED', 3, 'ENABLED', false, '已完成状态', null),

  (6003001, 6003, 'TODO_IMPORTANCE', 'low', '低优先级', 'LOW', 1, 'ENABLED', false, '低优先级', null),
  (6003002, 6003, 'TODO_IMPORTANCE', 'medium', '中优先级', 'MEDIUM', 2, 'ENABLED', true, '默认优先级', null),
  (6003003, 6003, 'TODO_IMPORTANCE', 'high', '高优先级', 'HIGH', 3, 'ENABLED', false, '高优先级', null),

  (6004001, 6004, 'APP_DATA_SOURCE_MODE', 'real', '真实数据', 'REAL', 1, 'ENABLED', true, '真实接口数据', null),
  (6004002, 6004, 'APP_DATA_SOURCE_MODE', 'demo', '演示数据', 'DEMO', 2, 'ENABLED', false, '演示数据模式', null),

  (6005001, 6005, 'APP_STATUS', 'enabled', '启用', 'ENABLED', 1, 'ENABLED', true, '启用状态', null),
  (6005002, 6005, 'APP_STATUS', 'disabled', '停用', 'DISABLED', 2, 'ENABLED', false, '停用状态', null),

  (6006001, 6006, 'APP_ICON_TYPE', 'preset', '预设图标', 'PRESET', 1, 'ENABLED', true, '预设图标', null),
  (6006002, 6006, 'APP_ICON_TYPE', 'upload', '本地上传', 'UPLOAD', 2, 'ENABLED', false, '上传图标', null),
  (6006003, 6006, 'APP_ICON_TYPE', 'url', '图片地址', 'URL', 3, 'ENABLED', false, '远程图片地址', null),
  (6006004, 6006, 'APP_ICON_TYPE', 'text', '文本图标', 'TEXT', 4, 'ENABLED', false, '文本图标', null),

  (6007001, 6007, 'APP_CATEGORY', 'office_collaboration', '办公协作', '办公协作', 1, 'ENABLED', false, '办公协作类应用', null),
  (6007002, 6007, 'APP_CATEGORY', 'efficiency_tool', '效率工具', '效率工具', 2, 'ENABLED', true, '效率工具类应用', null),
  (6007003, 6007, 'APP_CATEGORY', 'security_tool', '安全工具', '安全工具', 3, 'ENABLED', false, '安全工具类应用', null),
  (6007004, 6007, 'APP_CATEGORY', 'life_management', '生活管理', '生活管理', 4, 'ENABLED', false, '生活管理类应用', null),
  (6007005, 6007, 'APP_CATEGORY', 'financial_management', '财务管理', '财务管理', 5, 'ENABLED', false, '财务管理类应用', null),
  (6007006, 6007, 'APP_CATEGORY', 'knowledge_base', '知识沉淀', '知识沉淀', 6, 'ENABLED', false, '知识沉淀类应用', null),
  (6007007, 6007, 'APP_CATEGORY', 'resource_management', '资源管理', '资源管理', 7, 'ENABLED', false, '资源管理类应用', null),
  (6007008, 6007, 'APP_CATEGORY', 'entertainment_collection', '娱乐收藏', '娱乐收藏', 8, 'ENABLED', false, '娱乐收藏类应用', null),
  (6007009, 6007, 'APP_CATEGORY', 'system_management', '系统管理', '系统管理', 9, 'ENABLED', false, '系统管理类应用', null),

  (6008001, 6008, 'KNOWLEDGE_CATEGORY', 'work', '工作', '工作', 1, 'ENABLED', true, '工作类经验', null),
  (6008002, 6008, 'KNOWLEDGE_CATEGORY', 'life', '生活', '生活', 2, 'ENABLED', false, '生活类经验', null),
  (6008003, 6008, 'KNOWLEDGE_CATEGORY', 'study', '学习', '学习', 3, 'ENABLED', false, '学习类经验', null),
  (6008004, 6008, 'KNOWLEDGE_CATEGORY', 'tool', '工具', '工具', 4, 'ENABLED', false, '工具类经验', null),
  (6008005, 6008, 'KNOWLEDGE_CATEGORY', 'health', '健康', '健康', 5, 'ENABLED', false, '健康类经验', null),
  (6008006, 6008, 'KNOWLEDGE_CATEGORY', 'finance', '财务', '财务', 6, 'ENABLED', false, '财务类经验', null),
  (6008007, 6008, 'KNOWLEDGE_CATEGORY', 'other', '其他', '其他', 7, 'ENABLED', false, '其他分类', null),

  (6009001, 6009, 'SOFTWARE_PLATFORM', 'windows', 'Windows', 'WINDOWS', 1, 'ENABLED', true, 'Windows 平台', null),
  (6009002, 6009, 'SOFTWARE_PLATFORM', 'mac', 'macOS', 'MAC', 2, 'ENABLED', false, 'macOS 平台', null),
  (6009003, 6009, 'SOFTWARE_PLATFORM', 'linux', 'Linux', 'LINUX', 3, 'ENABLED', false, 'Linux 平台', null),
  (6009004, 6009, 'SOFTWARE_PLATFORM', 'cross', '跨平台', 'CROSS', 4, 'ENABLED', false, '跨平台软件', null),

  (6010001, 6010, 'SOFTWARE_RELEASE_CHANNEL', 'stable', '稳定版', 'STABLE', 1, 'ENABLED', true, '稳定版本', null),
  (6010002, 6010, 'SOFTWARE_RELEASE_CHANNEL', 'beta', '测试版', 'BETA', 2, 'ENABLED', false, '测试版本', null),
  (6010003, 6010, 'SOFTWARE_RELEASE_CHANNEL', 'legacy', '历史版', 'LEGACY', 3, 'ENABLED', false, '历史保留版本', null),

  (6011001, 6011, 'FUEL_TYPE', '92', '92 号汽油', '92', 1, 'ENABLED', false, '92 号汽油', null),
  (6011002, 6011, 'FUEL_TYPE', '95', '95 号汽油', '95', 2, 'ENABLED', true, '95 号汽油', null),
  (6011003, 6011, 'FUEL_TYPE', '98', '98 号汽油', '98', 3, 'ENABLED', false, '98 号汽油', null),
  (6011004, 6011, 'FUEL_TYPE', 'diesel', '柴油', 'DIESEL', 4, 'ENABLED', false, '柴油', null),

  (6012001, 6012, 'FUEL_FILL_TYPE', 'full', '满油', 'FULL', 1, 'ENABLED', true, '加满油', null),
  (6012002, 6012, 'FUEL_FILL_TYPE', 'partial', '补油', 'PARTIAL', 2, 'ENABLED', false, '补油', null),

  (6013001, 6013, 'WOW_FACTION', 'alliance', '联盟', 'ALLIANCE', 1, 'ENABLED', true, '联盟阵营', null),
  (6013002, 6013, 'WOW_FACTION', 'horde', '部落', 'HORDE', 2, 'ENABLED', false, '部落阵营', null),

  (6014001, 6014, 'WOW_CLASS_NAME', 'death_knight', '死亡骑士', '死亡骑士', 1, 'ENABLED', false, '死亡骑士', '{"color":"#C41F3B","textColor":"#ffffff"}'),
  (6014002, 6014, 'WOW_CLASS_NAME', 'demon_hunter', '恶魔猎手', '恶魔猎手', 2, 'ENABLED', false, '恶魔猎手', '{"color":"#A330C9","textColor":"#ffffff"}'),
  (6014003, 6014, 'WOW_CLASS_NAME', 'druid', '德鲁伊', '德鲁伊', 3, 'ENABLED', false, '德鲁伊', '{"color":"#FF7D0A","textColor":"#1f1607"}'),
  (6014004, 6014, 'WOW_CLASS_NAME', 'evoker', '唤魔师', '唤魔师', 4, 'ENABLED', false, '唤魔师', '{"color":"#33937F","textColor":"#ffffff"}'),
  (6014005, 6014, 'WOW_CLASS_NAME', 'hunter', '猎人', '猎人', 5, 'ENABLED', false, '猎人', '{"color":"#ABD473","textColor":"#1f2910"}'),
  (6014006, 6014, 'WOW_CLASS_NAME', 'mage', '法师', '法师', 6, 'ENABLED', false, '法师', '{"color":"#69CCF0","textColor":"#07202f"}'),
  (6014007, 6014, 'WOW_CLASS_NAME', 'monk', '武僧', '武僧', 7, 'ENABLED', false, '武僧', '{"color":"#00FF96","textColor":"#062119"}'),
  (6014008, 6014, 'WOW_CLASS_NAME', 'paladin', '圣骑士', '圣骑士', 8, 'ENABLED', false, '圣骑士', '{"color":"#F58CBA","textColor":"#2d0f1d"}'),
  (6014009, 6014, 'WOW_CLASS_NAME', 'priest', '牧师', '牧师', 9, 'ENABLED', false, '牧师', '{"color":"#F4F4F4","textColor":"#111111"}'),
  (6014010, 6014, 'WOW_CLASS_NAME', 'rogue', '潜行者', '潜行者', 10, 'ENABLED', false, '潜行者', '{"color":"#FFF569","textColor":"#312b07"}'),
  (6014011, 6014, 'WOW_CLASS_NAME', 'shaman', '萨满', '萨满', 11, 'ENABLED', false, '萨满', '{"color":"#0070DE","textColor":"#ffffff"}'),
  (6014012, 6014, 'WOW_CLASS_NAME', 'warlock', '术士', '术士', 12, 'ENABLED', false, '术士', '{"color":"#9482C9","textColor":"#100d1d"}'),
  (6014013, 6014, 'WOW_CLASS_NAME', 'warrior', '战士', '战士', 13, 'ENABLED', true, '战士', '{"color":"#C79C6E","textColor":"#23170d"}'),

  (6015001, 6015, 'WOW_MYTHIC_DUNGEON', 'magisters_terrace', '魔导师平台', '魔导师平台', 1, 'ENABLED', false, '12.0 第 1 赛季副本', null),
  (6015002, 6015, 'WOW_MYTHIC_DUNGEON', 'myssara_caverns', '迈萨拉洞窟', '迈萨拉洞窟', 2, 'ENABLED', false, '12.0 第 1 赛季副本', null),
  (6015003, 6015, 'WOW_MYTHIC_DUNGEON', 'the_nexus_sinnus', '节点希纳斯', '节点希纳斯', 3, 'ENABLED', false, '12.0 第 1 赛季副本', null),
  (6015004, 6015, 'WOW_MYTHIC_DUNGEON', 'windrunner_spire', '风行者之塔', '风行者之塔', 4, 'ENABLED', false, '12.0 第 1 赛季副本', null),
  (6015005, 6015, 'WOW_MYTHIC_DUNGEON', 'aegis_academy', '艾杰斯亚学院', '艾杰斯亚学院', 5, 'ENABLED', false, '12.0 第 1 赛季副本', null),
  (6015006, 6015, 'WOW_MYTHIC_DUNGEON', 'saron_mine', '萨隆矿坑', '萨隆矿坑', 6, 'ENABLED', false, '12.0 第 1 赛季副本', null),
  (6015007, 6015, 'WOW_MYTHIC_DUNGEON', 'seat_of_the_triumvirate', '执政团之座', '执政团之座', 7, 'ENABLED', false, '12.0 第 1 赛季副本', null),
  (6015008, 6015, 'WOW_MYTHIC_DUNGEON', 'skyreach', '通天峰', '通天峰', 8, 'ENABLED', false, '12.0 第 1 赛季副本', null),

  (6016001, 6016, 'PERSONAL_BILL_TYPE', 'expense', '支出', 'EXPENSE', 1, 'ENABLED', true, '支出账单', null),
  (6016002, 6016, 'PERSONAL_BILL_TYPE', 'income', '收入', 'INCOME', 2, 'ENABLED', false, '收入账单', null),

  (6017001, 6017, 'SOFTWARE_CATEGORY', 'development_tool', '开发工具', '开发工具', 1, 'ENABLED', true, '开发工具类软件', null),
  (6017002, 6017, 'SOFTWARE_CATEGORY', 'container_tool', '容器工具', '容器工具', 2, 'ENABLED', false, '容器与虚拟化工具', null),
  (6017003, 6017, 'SOFTWARE_CATEGORY', 'system_tool', '系统工具', '系统工具', 3, 'ENABLED', false, '系统维护工具', null),
  (6017004, 6017, 'SOFTWARE_CATEGORY', 'database_tool', '数据库工具', '数据库工具', 4, 'ENABLED', false, '数据库管理工具', null);

update gak_data_dictionary_item target
set deleted = true,
    updated_at = now()
where target.dict_code in (select distinct dict_code from seed_dictionary_items);

insert into gak_data_dictionary_item (
  id, dictionary_id, dict_code, item_code, item_label, item_value, sort_no, status, is_default, description, extra_json, created_at, updated_at, deleted
)
select
  id, dictionary_id, dict_code, item_code, item_label, item_value, sort_no, status, is_default, description, extra_json, now(), now(), false
from seed_dictionary_items
on conflict (id) do update
set dictionary_id = excluded.dictionary_id,
    dict_code = excluded.dict_code,
    item_code = excluded.item_code,
    item_label = excluded.item_label,
    item_value = excluded.item_value,
    sort_no = excluded.sort_no,
    status = excluded.status,
    is_default = excluded.is_default,
    description = excluded.description,
    extra_json = excluded.extra_json,
    updated_at = now(),
    deleted = false;

create temporary table seed_dictionary_usage (
  id bigint primary key,
  dict_code varchar(64) not null,
  dictionary_id bigint,
  app_code varchar(64) not null,
  app_name varchar(64),
  module_code varchar(64) not null,
  module_name varchar(64),
  biz_field_code varchar(64) not null,
  biz_field_name varchar(64),
  usage_type varchar(32) not null,
  value_mode varchar(32) not null,
  allow_multiple boolean not null,
  required_flag boolean not null,
  status varchar(20) not null,
  remark varchar(255)
) on commit drop;

insert into seed_dictionary_usage (
  id, dict_code, dictionary_id, app_code, app_name, module_code, module_name, biz_field_code, biz_field_name,
  usage_type, value_mode, allow_multiple, required_flag, status, remark
) values
  (7001001, 'USER_ROLE_TYPE', 5001, 'APP_USER_MANAGEMENT', '用户管理', 'SYSTEM_USER', '系统用户', 'roleCode', '角色编码', 'VALUE_VALIDATION', 'ITEM_VALUE', false, true, 'ENABLED', '系统用户角色字段；ADMIN 安全语义仍需代码保留'),
  (7001002, 'USER_STATUS', 5002, 'APP_USER_MANAGEMENT', '用户管理', 'SYSTEM_USER', '系统用户', 'status', '用户状态', 'VALUE_VALIDATION', 'ITEM_VALUE', false, true, 'ENABLED', '系统用户启停状态'),
  (7001003, 'USER_ROLE_TYPE', 5001, 'APP_USER_AUTH', '注册登录', 'AUTH_REGISTER', '用户注册', 'roleCode', '注册角色', 'VALUE_VALIDATION', 'ITEM_VALUE', false, true, 'ENABLED', '注册默认角色来源'),
  (7001004, 'USER_STATUS', 5002, 'APP_USER_AUTH', '注册登录', 'AUTH_REGISTER', '用户注册', 'status', '注册状态', 'VALUE_VALIDATION', 'ITEM_VALUE', false, true, 'ENABLED', '注册默认状态来源'),

  (7001005, 'WORK_LOG_TYPE', 5003, 'APP_WORK_LOG', '工作日志', 'WORK_LOG', '工作日志模块', 'typeCodes', '日志类型', 'VALUE_VALIDATION', 'ITEM_VALUE', true, true, 'ENABLED', '多选日志类型'),
  (7001006, 'WORK_LOG_PROJECT', 5004, 'APP_WORK_LOG', '工作日志', 'WORK_LOG', '工作日志模块', 'projectCode', '项目编码', 'OPTION_SOURCE', 'ITEM_VALUE', false, false, 'ENABLED', '当前前端仍为文本输入，后续切换下拉'),

  (7001007, 'TODO_LIST_CODE', 6001, 'APP_TODO_LIST', '待办列表', 'TODO_ITEM', '待办任务', 'listCode', '清单类型', 'VALUE_VALIDATION', 'ITEM_VALUE', false, true, 'ENABLED', '待办清单字段'),
  (7001008, 'TODO_STATUS', 6002, 'APP_TODO_LIST', '待办列表', 'TODO_ITEM', '待办任务', 'status', '任务状态', 'VALUE_VALIDATION', 'ITEM_VALUE', false, true, 'ENABLED', '待办状态字段'),
  (7001009, 'TODO_IMPORTANCE', 6003, 'APP_TODO_LIST', '待办列表', 'TODO_ITEM', '待办任务', 'importance', '任务优先级', 'VALUE_VALIDATION', 'ITEM_VALUE', false, true, 'ENABLED', '待办优先级字段'),

  (7001010, 'APP_SECURITY_LEVEL', 5005, 'APP_APP_MANAGEMENT', '应用管理', 'SYSTEM_APP', '应用目录', 'securityLevel', '应用密级', 'VALUE_VALIDATION', 'ITEM_VALUE', false, true, 'ENABLED', '应用密级字段'),
  (7001011, 'APP_ENCRYPTION_MODE', 5006, 'APP_APP_MANAGEMENT', '应用管理', 'SYSTEM_APP', '应用目录', 'encryptionMode', '加密方式', 'VALUE_VALIDATION', 'ITEM_VALUE', false, true, 'ENABLED', '应用加密方式字段'),
  (7001012, 'APP_DATA_SOURCE_MODE', 6004, 'APP_APP_MANAGEMENT', '应用管理', 'SYSTEM_APP', '应用目录', 'dataSourceMode', '数据来源', 'VALUE_VALIDATION', 'ITEM_VALUE', false, true, 'ENABLED', '应用真实/演示数据模式'),
  (7001013, 'APP_ICON_TYPE', 6006, 'APP_APP_MANAGEMENT', '应用管理', 'SYSTEM_APP', '应用目录', 'iconType', '图标类型', 'VALUE_VALIDATION', 'ITEM_VALUE', false, true, 'ENABLED', '应用图标来源类型'),
  (7001014, 'APP_STATUS', 6005, 'APP_APP_MANAGEMENT', '应用管理', 'SYSTEM_APP', '应用目录', 'status', '应用状态', 'VALUE_VALIDATION', 'ITEM_VALUE', false, true, 'ENABLED', '应用启停状态；仍需与 enabled 布尔值保持一致'),
  (7001015, 'APP_CATEGORY', 6007, 'APP_APP_MANAGEMENT', '应用管理', 'SYSTEM_APP', '应用目录', 'category', '应用分类', 'OPTION_SOURCE', 'ITEM_VALUE', false, false, 'ENABLED', '当前前端仍为文本输入，后续切换字典选择'),

  (7001016, 'KNOWLEDGE_CATEGORY', 6008, 'APP_KNOWLEDGE_BASE', '经验库', 'KNOWLEDGE_ENTRY', '经验条目', 'category', '经验分类', 'VALUE_VALIDATION', 'ITEM_VALUE', false, true, 'ENABLED', '经验库分类字段'),

  (7001017, 'SOFTWARE_PLATFORM', 6009, 'APP_SOFTWARE_REPO', '软件仓库', 'SOFTWARE_PACKAGE', '软件包', 'platformCode', '平台编码', 'VALUE_VALIDATION', 'ITEM_VALUE', false, true, 'ENABLED', '软件平台字段'),
  (7001018, 'SOFTWARE_RELEASE_CHANNEL', 6010, 'APP_SOFTWARE_REPO', '软件仓库', 'SOFTWARE_VERSION', '软件版本', 'releaseChannel', '发布渠道', 'VALUE_VALIDATION', 'ITEM_VALUE', false, true, 'ENABLED', '软件版本发布渠道'),
  (7001019, 'SOFTWARE_CATEGORY', 6017, 'APP_SOFTWARE_REPO', '软件仓库', 'SOFTWARE_PACKAGE', '软件包', 'categoryName', '软件分类', 'OPTION_SOURCE', 'ITEM_VALUE', false, false, 'ENABLED', '当前前端仍为文本输入，后续切换字典选择'),

  (7001020, 'FUEL_TYPE', 6011, 'APP_FUEL_STATS', '油耗统计', 'FUEL_RECORD', '加油记录', 'fuelType', '油品类型', 'VALUE_VALIDATION', 'ITEM_VALUE', false, true, 'ENABLED', '油耗记录油品字段'),
  (7001021, 'FUEL_FILL_TYPE', 6012, 'APP_FUEL_STATS', '油耗统计', 'FUEL_RECORD', '加油记录', 'fillType', '加油方式', 'VALUE_VALIDATION', 'ITEM_VALUE', false, true, 'ENABLED', '油耗记录加油方式字段'),

  (7001022, 'WOW_FACTION', 6013, 'APP_WOW_CHARACTER', 'WoW角色统计', 'WOW_CHARACTER', 'WoW角色', 'faction', '阵营', 'VALUE_VALIDATION', 'ITEM_VALUE', false, true, 'ENABLED', 'WoW 阵营字段'),
  (7001023, 'WOW_CLASS_NAME', 6014, 'APP_WOW_CHARACTER', 'WoW角色统计', 'WOW_CHARACTER', 'WoW角色', 'className', '职业', 'VALUE_VALIDATION', 'ITEM_VALUE', false, true, 'ENABLED', '当前类名字段存中文标签，使用 itemValue 校验'),
  (7001024, 'WOW_MYTHIC_DUNGEON', 6015, 'APP_WOW_CHARACTER', 'WoW角色统计', 'WOW_CHARACTER', 'WoW角色', 'mythicDungeonName', '大秘境副本', 'VALUE_VALIDATION', 'ITEM_VALUE', false, false, 'ENABLED', '大秘境副本名称字段'),

  (7001025, 'PERSONAL_BILL_TYPE', 6016, 'APP_PERSONAL_BILLS', '个人账单', 'PERSONAL_BILL', '个人账单', 'billType', '账单类型', 'VALUE_VALIDATION', 'ITEM_VALUE', false, true, 'ENABLED', '个人账单收支类型'),
  (7001026, 'WOW_CHARACTER_RACE', 2035628832674516994, 'APP_WOW_CHARACTER', 'WoW角色统计', 'WOW_CHARACTER', 'WoW角色', 'raceName', '种族', 'OPTION_SOURCE', 'ITEM_VALUE', false, false, 'ENABLED', '当前前端仍为文本输入，后续可切换字典选择');

insert into gak_data_dictionary_usage (
  id, dict_code, dictionary_id, app_code, app_name, module_code, module_name, biz_field_code, biz_field_name,
  usage_type, value_mode, allow_multiple, required_flag, status, usage_count, last_used_at, remark, created_at, updated_at
)
select
  id, dict_code, dictionary_id, app_code, app_name, module_code, module_name, biz_field_code, biz_field_name,
  usage_type, value_mode, allow_multiple, required_flag, status, 0, null, remark, now(), now()
from seed_dictionary_usage
on conflict (app_code, module_code, biz_field_code) do update
set dict_code = excluded.dict_code,
    dictionary_id = excluded.dictionary_id,
    app_name = excluded.app_name,
    module_code = excluded.module_code,
    module_name = excluded.module_name,
    biz_field_name = excluded.biz_field_name,
    usage_type = excluded.usage_type,
    value_mode = excluded.value_mode,
    allow_multiple = excluded.allow_multiple,
    required_flag = excluded.required_flag,
    status = excluded.status,
    remark = excluded.remark,
    updated_at = now();

commit;
