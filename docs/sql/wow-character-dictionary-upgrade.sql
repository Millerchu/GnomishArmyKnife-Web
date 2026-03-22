begin;

create temporary table seed_wow_dictionaries (
  id bigint primary key,
  dict_code varchar(64) not null,
  dict_name varchar(64) not null,
  status varchar(20) not null,
  reference_apps_json text,
  description varchar(255),
  creator_user_id bigint,
  creator_name varchar(64)
) on commit drop;

insert into seed_wow_dictionaries (
  id, dict_code, dict_name, status, reference_apps_json, description, creator_user_id, creator_name
) values
  (2035628832674516994, 'WOW_CHARACTER_RACE', '魔兽角色种族', 'ENABLED', '["WoW角色统计"]', 'WoW 可玩种族选项，含阵营与职业限制元数据', 900000000000000001, '系统管理员'),
  (6018, 'WOW_CLASS_SPEC', '魔兽职业专精', 'ENABLED', '["WoW角色统计"]', 'WoW 职业专精选项，itemValue 使用唯一 code', 900000000000000001, '系统管理员'),
  (6019, 'WOW_PRIMARY_PROFESSION', '魔兽主专业', 'ENABLED', '["WoW角色统计"]', 'WoW 主专业选项', 900000000000000001, '系统管理员');

update gak_data_dictionary target
set dict_name = source.dict_name,
    status = source.status,
    reference_apps_json = source.reference_apps_json,
    description = source.description,
    creator_user_id = source.creator_user_id,
    creator_name = source.creator_name,
    updated_at = now(),
    deleted = false
from seed_wow_dictionaries source
where target.dict_code = source.dict_code;

insert into gak_data_dictionary (
  id, dict_code, dict_name, status, reference_apps_json, description, creator_user_id, creator_name, created_at, updated_at, deleted
)
select
  source.id, source.dict_code, source.dict_name, source.status, source.reference_apps_json, source.description,
  source.creator_user_id, source.creator_name, now(), now(), false
from seed_wow_dictionaries source
where not exists (
  select 1
  from gak_data_dictionary existing
  where existing.dict_code = source.dict_code
);

create temporary table seed_wow_dictionary_items (
  id bigint primary key,
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

insert into seed_wow_dictionary_items (
  id, dict_code, item_code, item_label, item_value, sort_no, status, is_default, description, extra_json
) values
  (6018001, 'WOW_CHARACTER_RACE', 'human', '人类', '人类', 1, 'ENABLED', false, 'WoW 可玩种族', '{"factions":["ALLIANCE"],"allowedClassCodes":["death_knight","hunter","mage","monk","paladin","priest","rogue","warlock","warrior"]}'),
  (6018002, 'WOW_CHARACTER_RACE', 'dwarf', '矮人', '矮人', 2, 'ENABLED', false, 'WoW 可玩种族', '{"factions":["ALLIANCE"],"allowedClassCodes":["death_knight","hunter","mage","monk","paladin","priest","rogue","shaman","warlock","warrior"]}'),
  (6018003, 'WOW_CHARACTER_RACE', 'night_elf', '暗夜精灵', '暗夜精灵', 3, 'ENABLED', false, 'WoW 可玩种族', '{"factions":["ALLIANCE"],"allowedClassCodes":["death_knight","demon_hunter","druid","hunter","mage","monk","priest","rogue","warlock","warrior"]}'),
  (6018004, 'WOW_CHARACTER_RACE', 'gnome', '侏儒', '侏儒', 4, 'ENABLED', false, 'WoW 可玩种族', '{"factions":["ALLIANCE"],"allowedClassCodes":["death_knight","hunter","mage","monk","priest","rogue","warlock","warrior"]}'),
  (6018005, 'WOW_CHARACTER_RACE', 'draenei', '德莱尼', '德莱尼', 5, 'ENABLED', false, 'WoW 可玩种族', '{"factions":["ALLIANCE"],"allowedClassCodes":["death_knight","hunter","mage","monk","paladin","priest","rogue","shaman","warlock","warrior"]}'),
  (6018006, 'WOW_CHARACTER_RACE', 'worgen', '狼人', '狼人', 6, 'ENABLED', false, 'WoW 可玩种族', '{"factions":["ALLIANCE"],"allowedClassCodes":["death_knight","druid","hunter","mage","monk","priest","rogue","warlock","warrior"]}'),
  (6018007, 'WOW_CHARACTER_RACE', 'pandaren', '熊猫人', '熊猫人', 7, 'ENABLED', false, 'WoW 可玩种族', '{"factions":["ALLIANCE","HORDE"],"allowedClassCodes":["death_knight","hunter","mage","monk","priest","rogue","shaman","warlock","warrior"]}'),
  (6018008, 'WOW_CHARACTER_RACE', 'dracthyr', '龙希尔', '龙希尔', 8, 'ENABLED', false, 'WoW 可玩种族', '{"factions":["ALLIANCE","HORDE"],"allowedClassCodes":["evoker","hunter","mage","priest","rogue","warlock","warrior"]}'),
  (6018009, 'WOW_CHARACTER_RACE', 'void_elf', '虚空精灵', '虚空精灵', 9, 'ENABLED', false, 'WoW 可玩种族', '{"factions":["ALLIANCE"],"allowedClassCodes":["death_knight","demon_hunter","hunter","mage","monk","priest","rogue","warlock","warrior"]}'),
  (6018010, 'WOW_CHARACTER_RACE', 'lightforged_draenei', '光铸德莱尼', '光铸德莱尼', 10, 'ENABLED', false, 'WoW 可玩种族', '{"factions":["ALLIANCE"],"allowedClassCodes":["death_knight","hunter","mage","monk","paladin","priest","rogue","warlock","warrior"]}'),
  (6018011, 'WOW_CHARACTER_RACE', 'dark_iron_dwarf', '黑铁矮人', '黑铁矮人', 11, 'ENABLED', false, 'WoW 可玩种族', '{"factions":["ALLIANCE"],"allowedClassCodes":["death_knight","hunter","mage","monk","paladin","priest","rogue","shaman","warlock","warrior"]}'),
  (6018012, 'WOW_CHARACTER_RACE', 'kul_tiran', '库尔提拉斯人', '库尔提拉斯人', 12, 'ENABLED', false, 'WoW 可玩种族', '{"factions":["ALLIANCE"],"allowedClassCodes":["death_knight","druid","hunter","mage","monk","priest","rogue","shaman","warlock","warrior"]}'),
  (6018013, 'WOW_CHARACTER_RACE', 'mechagnome', '机械侏儒', '机械侏儒', 13, 'ENABLED', false, 'WoW 可玩种族', '{"factions":["ALLIANCE"],"allowedClassCodes":["death_knight","hunter","mage","monk","priest","rogue","warlock","warrior"]}'),
  (6018014, 'WOW_CHARACTER_RACE', 'earthen', '土灵', '土灵', 14, 'ENABLED', false, 'WoW 可玩种族', '{"factions":["ALLIANCE","HORDE"],"allowedClassCodes":["hunter","mage","monk","paladin","priest","rogue","shaman","warlock","warrior"]}'),
  (6018015, 'WOW_CHARACTER_RACE', 'orc', '兽人', '兽人', 15, 'ENABLED', false, 'WoW 可玩种族', '{"factions":["HORDE"],"allowedClassCodes":["death_knight","hunter","mage","monk","priest","rogue","shaman","warlock","warrior"]}'),
  (6018016, 'WOW_CHARACTER_RACE', 'undead', '亡灵', '亡灵', 16, 'ENABLED', false, 'WoW 可玩种族', '{"factions":["HORDE"],"allowedClassCodes":["death_knight","hunter","mage","monk","priest","rogue","warlock","warrior"]}'),
  (6018017, 'WOW_CHARACTER_RACE', 'tauren', '牛头人', '牛头人', 17, 'ENABLED', false, 'WoW 可玩种族', '{"factions":["HORDE"],"allowedClassCodes":["death_knight","druid","hunter","mage","monk","paladin","priest","rogue","shaman","warlock","warrior"]}'),
  (6018018, 'WOW_CHARACTER_RACE', 'troll', '巨魔', '巨魔', 18, 'ENABLED', false, 'WoW 可玩种族', '{"factions":["HORDE"],"allowedClassCodes":["death_knight","druid","hunter","mage","monk","priest","rogue","shaman","warlock","warrior"]}'),
  (6018019, 'WOW_CHARACTER_RACE', 'blood_elf', '血精灵', '血精灵', 19, 'ENABLED', false, 'WoW 可玩种族', '{"factions":["HORDE"],"allowedClassCodes":["death_knight","demon_hunter","hunter","mage","monk","paladin","priest","rogue","warlock","warrior"]}'),
  (6018020, 'WOW_CHARACTER_RACE', 'goblin', '地精', '地精', 20, 'ENABLED', false, 'WoW 可玩种族', '{"factions":["HORDE"],"allowedClassCodes":["death_knight","hunter","mage","monk","priest","rogue","shaman","warlock","warrior"]}'),
  (6018021, 'WOW_CHARACTER_RACE', 'nightborne', '夜之子', '夜之子', 21, 'ENABLED', false, 'WoW 可玩种族', '{"factions":["HORDE"],"allowedClassCodes":["death_knight","hunter","mage","monk","priest","rogue","warlock","warrior"]}'),
  (6018022, 'WOW_CHARACTER_RACE', 'highmountain_tauren', '至高岭牛头人', '至高岭牛头人', 22, 'ENABLED', false, 'WoW 可玩种族', '{"factions":["HORDE"],"allowedClassCodes":["death_knight","druid","hunter","mage","monk","priest","rogue","shaman","warlock","warrior"]}'),
  (6018023, 'WOW_CHARACTER_RACE', 'maghar_orc', '玛格汉兽人', '玛格汉兽人', 23, 'ENABLED', false, 'WoW 可玩种族', '{"factions":["HORDE"],"allowedClassCodes":["death_knight","hunter","mage","monk","priest","rogue","shaman","warlock","warrior"]}'),
  (6018024, 'WOW_CHARACTER_RACE', 'zandalari_troll', '赞达拉巨魔', '赞达拉巨魔', 24, 'ENABLED', false, 'WoW 可玩种族', '{"factions":["HORDE"],"allowedClassCodes":["death_knight","druid","hunter","mage","monk","paladin","priest","rogue","shaman","warlock","warrior"]}'),
  (6018025, 'WOW_CHARACTER_RACE', 'vulpera', '狐人', '狐人', 25, 'ENABLED', false, 'WoW 可玩种族', '{"factions":["HORDE"],"allowedClassCodes":["death_knight","hunter","mage","monk","priest","rogue","shaman","warlock","warrior"]}'),
  (6018026, 'WOW_CHARACTER_RACE', 'haranir', '哈拉尼尔', '哈拉尼尔', 26, 'ENABLED', false, 'WoW 可玩种族', '{"factions":["ALLIANCE","HORDE"],"allowedClassCodes":["druid","hunter","mage","monk","priest","rogue","shaman","warlock","warrior"]}'),

  (6019001, 'WOW_CLASS_SPEC', 'blood_death_knight', '鲜血', 'blood_death_knight', 1, 'ENABLED', true, 'WoW 职业专精', '{"classCode":"death_knight"}'),
  (6019002, 'WOW_CLASS_SPEC', 'frost_death_knight', '冰霜', 'frost_death_knight', 2, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"death_knight"}'),
  (6019003, 'WOW_CLASS_SPEC', 'unholy_death_knight', '邪恶', 'unholy_death_knight', 3, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"death_knight"}'),
  (6019004, 'WOW_CLASS_SPEC', 'devourer', 'Devourer', 'devourer', 4, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"demon_hunter"}'),
  (6019005, 'WOW_CLASS_SPEC', 'havoc', '浩劫', 'havoc', 5, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"demon_hunter"}'),
  (6019006, 'WOW_CLASS_SPEC', 'vengeance', '复仇', 'vengeance', 6, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"demon_hunter"}'),
  (6019007, 'WOW_CLASS_SPEC', 'balance', '平衡', 'balance', 7, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"druid"}'),
  (6019008, 'WOW_CLASS_SPEC', 'feral', '野性', 'feral', 8, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"druid"}'),
  (6019009, 'WOW_CLASS_SPEC', 'guardian', '守护', 'guardian', 9, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"druid"}'),
  (6019010, 'WOW_CLASS_SPEC', 'restoration_druid', '恢复', 'restoration_druid', 10, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"druid"}'),
  (6019011, 'WOW_CLASS_SPEC', 'augmentation', '增辉', 'augmentation', 11, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"evoker"}'),
  (6019012, 'WOW_CLASS_SPEC', 'devastation', '湮灭', 'devastation', 12, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"evoker"}'),
  (6019013, 'WOW_CLASS_SPEC', 'preservation', '恩护', 'preservation', 13, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"evoker"}'),
  (6019014, 'WOW_CLASS_SPEC', 'beast_mastery', '野兽控制', 'beast_mastery', 14, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"hunter"}'),
  (6019015, 'WOW_CLASS_SPEC', 'marksmanship', '射击', 'marksmanship', 15, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"hunter"}'),
  (6019016, 'WOW_CLASS_SPEC', 'survival', '生存', 'survival', 16, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"hunter"}'),
  (6019017, 'WOW_CLASS_SPEC', 'arcane', '奥术', 'arcane', 17, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"mage"}'),
  (6019018, 'WOW_CLASS_SPEC', 'fire', '火焰', 'fire', 18, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"mage"}'),
  (6019019, 'WOW_CLASS_SPEC', 'frost_mage', '冰霜', 'frost_mage', 19, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"mage"}'),
  (6019020, 'WOW_CLASS_SPEC', 'brewmaster', '酒仙', 'brewmaster', 20, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"monk"}'),
  (6019021, 'WOW_CLASS_SPEC', 'mistweaver', '织雾', 'mistweaver', 21, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"monk"}'),
  (6019022, 'WOW_CLASS_SPEC', 'windwalker', '踏风', 'windwalker', 22, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"monk"}'),
  (6019023, 'WOW_CLASS_SPEC', 'holy_paladin', '神圣', 'holy_paladin', 23, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"paladin"}'),
  (6019024, 'WOW_CLASS_SPEC', 'protection_paladin', '防护', 'protection_paladin', 24, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"paladin"}'),
  (6019025, 'WOW_CLASS_SPEC', 'retribution', '惩戒', 'retribution', 25, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"paladin"}'),
  (6019026, 'WOW_CLASS_SPEC', 'discipline', '戒律', 'discipline', 26, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"priest"}'),
  (6019027, 'WOW_CLASS_SPEC', 'holy_priest', '神圣', 'holy_priest', 27, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"priest"}'),
  (6019028, 'WOW_CLASS_SPEC', 'shadow', '暗影', 'shadow', 28, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"priest"}'),
  (6019029, 'WOW_CLASS_SPEC', 'assassination', '奇袭', 'assassination', 29, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"rogue"}'),
  (6019030, 'WOW_CLASS_SPEC', 'outlaw', '狂徒', 'outlaw', 30, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"rogue"}'),
  (6019031, 'WOW_CLASS_SPEC', 'subtlety', '敏锐', 'subtlety', 31, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"rogue"}'),
  (6019032, 'WOW_CLASS_SPEC', 'elemental', '元素', 'elemental', 32, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"shaman"}'),
  (6019033, 'WOW_CLASS_SPEC', 'enhancement', '增强', 'enhancement', 33, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"shaman"}'),
  (6019034, 'WOW_CLASS_SPEC', 'restoration_shaman', '恢复', 'restoration_shaman', 34, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"shaman"}'),
  (6019035, 'WOW_CLASS_SPEC', 'affliction', '痛苦', 'affliction', 35, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"warlock"}'),
  (6019036, 'WOW_CLASS_SPEC', 'demonology', '恶魔学识', 'demonology', 36, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"warlock"}'),
  (6019037, 'WOW_CLASS_SPEC', 'destruction', '毁灭', 'destruction', 37, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"warlock"}'),
  (6019038, 'WOW_CLASS_SPEC', 'arms', '武器', 'arms', 38, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"warrior"}'),
  (6019039, 'WOW_CLASS_SPEC', 'fury', '狂怒', 'fury', 39, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"warrior"}'),
  (6019040, 'WOW_CLASS_SPEC', 'protection_warrior', '防护', 'protection_warrior', 40, 'ENABLED', false, 'WoW 职业专精', '{"classCode":"warrior"}'),

  (6019101, 'WOW_PRIMARY_PROFESSION', 'alchemy', '炼金术', '炼金术', 1, 'ENABLED', true, 'WoW 主专业', null),
  (6019102, 'WOW_PRIMARY_PROFESSION', 'blacksmithing', '锻造', '锻造', 2, 'ENABLED', false, 'WoW 主专业', null),
  (6019103, 'WOW_PRIMARY_PROFESSION', 'enchanting', '附魔', '附魔', 3, 'ENABLED', false, 'WoW 主专业', null),
  (6019104, 'WOW_PRIMARY_PROFESSION', 'engineering', '工程学', '工程学', 4, 'ENABLED', false, 'WoW 主专业', null),
  (6019105, 'WOW_PRIMARY_PROFESSION', 'herbalism', '草药学', '草药学', 5, 'ENABLED', false, 'WoW 主专业', null),
  (6019106, 'WOW_PRIMARY_PROFESSION', 'inscription', '铭文', '铭文', 6, 'ENABLED', false, 'WoW 主专业', null),
  (6019107, 'WOW_PRIMARY_PROFESSION', 'jewelcrafting', '珠宝加工', '珠宝加工', 7, 'ENABLED', false, 'WoW 主专业', null),
  (6019108, 'WOW_PRIMARY_PROFESSION', 'leatherworking', '制皮', '制皮', 8, 'ENABLED', false, 'WoW 主专业', null),
  (6019109, 'WOW_PRIMARY_PROFESSION', 'mining', '采矿', '采矿', 9, 'ENABLED', false, 'WoW 主专业', null),
  (6019110, 'WOW_PRIMARY_PROFESSION', 'skinning', '剥皮', '剥皮', 10, 'ENABLED', false, 'WoW 主专业', null),
  (6019111, 'WOW_PRIMARY_PROFESSION', 'tailoring', '裁缝', '裁缝', 11, 'ENABLED', false, 'WoW 主专业', null);

create temporary table existing_wow_item_targets on commit drop as
select distinct on (target.dict_code, target.item_code)
  target.id as target_id,
  target.dict_code,
  target.item_code
from gak_data_dictionary_item target
join seed_wow_dictionary_items source
  on source.dict_code = target.dict_code
 and source.item_code = target.item_code
order by target.dict_code, target.item_code, target.deleted asc, target.id asc;

update gak_data_dictionary_item target
set item_label = source.item_label,
    item_value = source.item_value,
    sort_no = source.sort_no,
    status = source.status,
    is_default = source.is_default,
    description = source.description,
    extra_json = source.extra_json,
    updated_at = now(),
    deleted = false
from seed_wow_dictionary_items source
join existing_wow_item_targets keep
  on keep.dict_code = source.dict_code
 and keep.item_code = source.item_code
where target.id = keep.target_id;

insert into gak_data_dictionary_item (
  id, dictionary_id, dict_code, item_code, item_label, item_value, sort_no, status, is_default, description, extra_json, created_at, updated_at, deleted
)
select
  source.id, dictionary.id, source.dict_code, source.item_code, source.item_label, source.item_value, source.sort_no,
  source.status, source.is_default, source.description, source.extra_json, now(), now(), false
from seed_wow_dictionary_items source
join gak_data_dictionary dictionary on dictionary.dict_code = source.dict_code
where not exists (
  select 1
  from existing_wow_item_targets keep
  where keep.dict_code = source.dict_code
    and keep.item_code = source.item_code
);

update gak_data_dictionary_item target
set deleted = true,
    updated_at = now()
where target.dict_code in ('WOW_CHARACTER_RACE', 'WOW_CLASS_SPEC', 'WOW_PRIMARY_PROFESSION')
  and not exists (
    select 1
    from seed_wow_dictionary_items source
    left join existing_wow_item_targets keep
      on keep.dict_code = source.dict_code
     and keep.item_code = source.item_code
    where target.dict_code = source.dict_code
      and target.item_code = source.item_code
      and target.id = coalesce(keep.target_id, source.id)
  );

create temporary table seed_wow_dictionary_usage (
  id bigint primary key,
  dict_code varchar(64) not null,
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

insert into seed_wow_dictionary_usage (
  id, dict_code, app_code, app_name, module_code, module_name, biz_field_code, biz_field_name,
  usage_type, value_mode, allow_multiple, required_flag, status, remark
) values
  (7001022, 'WOW_FACTION', 'APP_WOW_CHARACTER', 'WoW角色统计', 'WOW_CHARACTER', 'WoW角色', 'faction', '阵营', 'VALUE_VALIDATION', 'ITEM_VALUE', false, true, 'ENABLED', 'WoW 阵营字段'),
  (7001023, 'WOW_CLASS_NAME', 'APP_WOW_CHARACTER', 'WoW角色统计', 'WOW_CHARACTER', 'WoW角色', 'className', '职业', 'VALUE_VALIDATION', 'ITEM_VALUE', false, true, 'ENABLED', '当前类名字段存中文标签，使用 itemValue 校验'),
  (7001024, 'WOW_MYTHIC_DUNGEON', 'APP_WOW_CHARACTER', 'WoW角色统计', 'WOW_CHARACTER', 'WoW角色', 'mythicDungeonName', '大秘境副本', 'VALUE_VALIDATION', 'ITEM_VALUE', false, false, 'ENABLED', '大秘境副本名称字段'),
  (7001026, 'WOW_CHARACTER_RACE', 'APP_WOW_CHARACTER', 'WoW角色统计', 'WOW_CHARACTER', 'WoW角色', 'raceName', '种族', 'VALUE_VALIDATION', 'ITEM_VALUE', false, true, 'ENABLED', 'WoW 种族字段'),
  (7001027, 'WOW_CLASS_SPEC', 'APP_WOW_CHARACTER', 'WoW角色统计', 'WOW_CHARACTER', 'WoW角色', 'specName', '专精', 'VALUE_VALIDATION', 'ITEM_VALUE', false, true, 'ENABLED', 'WoW 专精选项，前端当前按 itemValue 存储唯一 code'),
  (7001028, 'WOW_PRIMARY_PROFESSION', 'APP_WOW_CHARACTER', 'WoW角色统计', 'WOW_CHARACTER', 'WoW角色', 'professionPrimary', '专业1', 'VALUE_VALIDATION', 'ITEM_VALUE', false, false, 'ENABLED', 'WoW 主专业字段'),
  (7001029, 'WOW_PRIMARY_PROFESSION', 'APP_WOW_CHARACTER', 'WoW角色统计', 'WOW_CHARACTER', 'WoW角色', 'professionSecondary', '专业2', 'VALUE_VALIDATION', 'ITEM_VALUE', false, false, 'ENABLED', 'WoW 主专业字段');

update gak_data_dictionary_usage target
set dict_code = source.dict_code,
    dictionary_id = dictionary.id,
    app_name = source.app_name,
    module_code = source.module_code,
    module_name = source.module_name,
    biz_field_name = source.biz_field_name,
    usage_type = source.usage_type,
    value_mode = source.value_mode,
    allow_multiple = source.allow_multiple,
    required_flag = source.required_flag,
    status = source.status,
    remark = source.remark,
    updated_at = now()
from seed_wow_dictionary_usage source
join gak_data_dictionary dictionary on dictionary.dict_code = source.dict_code
where target.app_code = source.app_code
  and target.module_code = source.module_code
  and target.biz_field_code = source.biz_field_code;

insert into gak_data_dictionary_usage (
  id, dict_code, dictionary_id, app_code, app_name, module_code, module_name, biz_field_code, biz_field_name,
  usage_type, value_mode, allow_multiple, required_flag, status, usage_count, last_used_at, remark, created_at, updated_at
)
select
  source.id, source.dict_code, dictionary.id, source.app_code, source.app_name, source.module_code, source.module_name,
  source.biz_field_code, source.biz_field_name, source.usage_type, source.value_mode, source.allow_multiple,
  source.required_flag, source.status, 0, null, source.remark, now(), now()
from seed_wow_dictionary_usage source
join gak_data_dictionary dictionary on dictionary.dict_code = source.dict_code
where not exists (
  select 1
  from gak_data_dictionary_usage existing
  where existing.app_code = source.app_code
    and existing.module_code = source.module_code
    and existing.biz_field_code = source.biz_field_code
);

commit;
