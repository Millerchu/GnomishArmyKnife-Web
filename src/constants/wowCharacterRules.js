const ALLIANCE = 'ALLIANCE'
const HORDE = 'HORDE'

export const WOW_RACE_RULES = {
  human: {label: '人类', factions: [ALLIANCE]},
  dwarf: {label: '矮人', factions: [ALLIANCE]},
  night_elf: {label: '暗夜精灵', factions: [ALLIANCE]},
  gnome: {label: '侏儒', factions: [ALLIANCE]},
  draenei: {label: '德莱尼', factions: [ALLIANCE]},
  worgen: {label: '狼人', factions: [ALLIANCE]},
  pandaren: {label: '熊猫人', factions: [ALLIANCE, HORDE]},
  dracthyr: {label: '龙希尔', factions: [ALLIANCE, HORDE]},
  void_elf: {label: '虚空精灵', factions: [ALLIANCE]},
  lightforged_draenei: {label: '光铸德莱尼', factions: [ALLIANCE]},
  dark_iron_dwarf: {label: '黑铁矮人', factions: [ALLIANCE]},
  kul_tiran: {label: '库尔提拉斯人', factions: [ALLIANCE]},
  mechagnome: {label: '机械侏儒', factions: [ALLIANCE]},
  earthen: {label: '土灵', factions: [ALLIANCE, HORDE]},
  orc: {label: '兽人', factions: [HORDE]},
  undead: {label: '亡灵', factions: [HORDE]},
  tauren: {label: '牛头人', factions: [HORDE]},
  troll: {label: '巨魔', factions: [HORDE]},
  blood_elf: {label: '血精灵', factions: [HORDE]},
  goblin: {label: '地精', factions: [HORDE]},
  nightborne: {label: '夜之子', factions: [HORDE]},
  highmountain_tauren: {label: '至高岭牛头人', factions: [HORDE]},
  maghar_orc: {label: '玛格汉兽人', factions: [HORDE]},
  zandalari_troll: {label: '赞达拉巨魔', factions: [HORDE]},
  vulpera: {label: '狐人', factions: [HORDE]},
  haranir: {label: '哈拉尼尔', factions: [ALLIANCE, HORDE]}
}

const ALL_RACE_CODES = Object.keys(WOW_RACE_RULES)
const ALL_RACES_EXCEPT_DRACTHYR = ALL_RACE_CODES.filter((code) => code !== 'dracthyr')
const ALL_RACES_EXCEPT_DRACTHYR_EARTHEN_HARANIR = ALL_RACE_CODES.filter((code) => !['dracthyr', 'earthen', 'haranir'].includes(code))

export const WOW_CLASS_RULES = {
  death_knight: {
    label: '死亡骑士',
    style: {color: '#C41F3B', textColor: '#ffffff'},
    allowedRaceCodes: ALL_RACES_EXCEPT_DRACTHYR_EARTHEN_HARANIR,
    specCodes: ['blood_death_knight', 'frost_death_knight', 'unholy_death_knight']
  },
  demon_hunter: {
    label: '恶魔猎手',
    style: {color: '#A330C9', textColor: '#ffffff'},
    allowedRaceCodes: ['night_elf', 'void_elf', 'blood_elf'],
    specCodes: ['devourer', 'havoc', 'vengeance']
  },
  druid: {
    label: '德鲁伊',
    style: {color: '#FF7D0A', textColor: '#1f1607'},
    allowedRaceCodes: ['night_elf', 'worgen', 'kul_tiran', 'tauren', 'troll', 'highmountain_tauren', 'zandalari_troll', 'haranir'],
    specCodes: ['balance', 'feral', 'guardian', 'restoration_druid']
  },
  evoker: {
    label: '唤魔师',
    style: {color: '#33937F', textColor: '#ffffff'},
    allowedRaceCodes: ['dracthyr'],
    specCodes: ['augmentation', 'devastation', 'preservation']
  },
  hunter: {
    label: '猎人',
    style: {color: '#ABD473', textColor: '#1f2910'},
    allowedRaceCodes: ALL_RACE_CODES,
    specCodes: ['beast_mastery', 'marksmanship', 'survival']
  },
  mage: {
    label: '法师',
    style: {color: '#69CCF0', textColor: '#07202f'},
    allowedRaceCodes: ALL_RACE_CODES,
    specCodes: ['arcane', 'fire', 'frost_mage']
  },
  monk: {
    label: '武僧',
    style: {color: '#00FF96', textColor: '#062119'},
    allowedRaceCodes: ALL_RACES_EXCEPT_DRACTHYR,
    specCodes: ['brewmaster', 'mistweaver', 'windwalker']
  },
  paladin: {
    label: '圣骑士',
    style: {color: '#F58CBA', textColor: '#2d0f1d'},
    allowedRaceCodes: ['human', 'dwarf', 'draenei', 'lightforged_draenei', 'dark_iron_dwarf', 'earthen', 'tauren', 'blood_elf', 'zandalari_troll'],
    specCodes: ['holy_paladin', 'protection_paladin', 'retribution']
  },
  priest: {
    label: '牧师',
    style: {color: '#F4F4F4', textColor: '#111111'},
    allowedRaceCodes: ALL_RACE_CODES,
    specCodes: ['discipline', 'holy_priest', 'shadow']
  },
  rogue: {
    label: '潜行者',
    style: {color: '#FFF569', textColor: '#312b07'},
    allowedRaceCodes: ALL_RACE_CODES,
    specCodes: ['assassination', 'outlaw', 'subtlety']
  },
  shaman: {
    label: '萨满',
    style: {color: '#0070DE', textColor: '#ffffff'},
    allowedRaceCodes: ['dwarf', 'draenei', 'pandaren', 'dark_iron_dwarf', 'kul_tiran', 'earthen', 'haranir', 'orc', 'tauren', 'troll', 'goblin', 'highmountain_tauren', 'maghar_orc', 'zandalari_troll', 'vulpera'],
    specCodes: ['elemental', 'enhancement', 'restoration_shaman']
  },
  warlock: {
    label: '术士',
    style: {color: '#9482C9', textColor: '#100d1d'},
    allowedRaceCodes: ALL_RACE_CODES,
    specCodes: ['affliction', 'demonology', 'destruction']
  },
  warrior: {
    label: '战士',
    style: {color: '#C79C6E', textColor: '#23170d'},
    allowedRaceCodes: ALL_RACE_CODES,
    specCodes: ['arms', 'fury', 'protection_warrior']
  }
}

export const WOW_SPEC_PRESETS = [
  {itemCode: 'blood_death_knight', itemLabel: '鲜血', itemValue: 'blood_death_knight', sortNo: 1, classCode: 'death_knight'},
  {itemCode: 'frost_death_knight', itemLabel: '冰霜', itemValue: 'frost_death_knight', sortNo: 2, classCode: 'death_knight'},
  {itemCode: 'unholy_death_knight', itemLabel: '邪恶', itemValue: 'unholy_death_knight', sortNo: 3, classCode: 'death_knight'},
  {itemCode: 'devourer', itemLabel: 'Devourer', itemValue: 'devourer', sortNo: 4, classCode: 'demon_hunter'},
  {itemCode: 'havoc', itemLabel: '浩劫', itemValue: 'havoc', sortNo: 5, classCode: 'demon_hunter'},
  {itemCode: 'vengeance', itemLabel: '复仇', itemValue: 'vengeance', sortNo: 6, classCode: 'demon_hunter'},
  {itemCode: 'balance', itemLabel: '平衡', itemValue: 'balance', sortNo: 7, classCode: 'druid'},
  {itemCode: 'feral', itemLabel: '野性', itemValue: 'feral', sortNo: 8, classCode: 'druid'},
  {itemCode: 'guardian', itemLabel: '守护', itemValue: 'guardian', sortNo: 9, classCode: 'druid'},
  {itemCode: 'restoration_druid', itemLabel: '恢复', itemValue: 'restoration_druid', sortNo: 10, classCode: 'druid'},
  {itemCode: 'augmentation', itemLabel: '增辉', itemValue: 'augmentation', sortNo: 11, classCode: 'evoker'},
  {itemCode: 'devastation', itemLabel: '湮灭', itemValue: 'devastation', sortNo: 12, classCode: 'evoker'},
  {itemCode: 'preservation', itemLabel: '恩护', itemValue: 'preservation', sortNo: 13, classCode: 'evoker'},
  {itemCode: 'beast_mastery', itemLabel: '野兽控制', itemValue: 'beast_mastery', sortNo: 14, classCode: 'hunter'},
  {itemCode: 'marksmanship', itemLabel: '射击', itemValue: 'marksmanship', sortNo: 15, classCode: 'hunter'},
  {itemCode: 'survival', itemLabel: '生存', itemValue: 'survival', sortNo: 16, classCode: 'hunter'},
  {itemCode: 'arcane', itemLabel: '奥术', itemValue: 'arcane', sortNo: 17, classCode: 'mage'},
  {itemCode: 'fire', itemLabel: '火焰', itemValue: 'fire', sortNo: 18, classCode: 'mage'},
  {itemCode: 'frost_mage', itemLabel: '冰霜', itemValue: 'frost_mage', sortNo: 19, classCode: 'mage'},
  {itemCode: 'brewmaster', itemLabel: '酒仙', itemValue: 'brewmaster', sortNo: 20, classCode: 'monk'},
  {itemCode: 'mistweaver', itemLabel: '织雾', itemValue: 'mistweaver', sortNo: 21, classCode: 'monk'},
  {itemCode: 'windwalker', itemLabel: '踏风', itemValue: 'windwalker', sortNo: 22, classCode: 'monk'},
  {itemCode: 'holy_paladin', itemLabel: '神圣', itemValue: 'holy_paladin', sortNo: 23, classCode: 'paladin'},
  {itemCode: 'protection_paladin', itemLabel: '防护', itemValue: 'protection_paladin', sortNo: 24, classCode: 'paladin'},
  {itemCode: 'retribution', itemLabel: '惩戒', itemValue: 'retribution', sortNo: 25, classCode: 'paladin'},
  {itemCode: 'discipline', itemLabel: '戒律', itemValue: 'discipline', sortNo: 26, classCode: 'priest'},
  {itemCode: 'holy_priest', itemLabel: '神圣', itemValue: 'holy_priest', sortNo: 27, classCode: 'priest'},
  {itemCode: 'shadow', itemLabel: '暗影', itemValue: 'shadow', sortNo: 28, classCode: 'priest'},
  {itemCode: 'assassination', itemLabel: '奇袭', itemValue: 'assassination', sortNo: 29, classCode: 'rogue'},
  {itemCode: 'outlaw', itemLabel: '狂徒', itemValue: 'outlaw', sortNo: 30, classCode: 'rogue'},
  {itemCode: 'subtlety', itemLabel: '敏锐', itemValue: 'subtlety', sortNo: 31, classCode: 'rogue'},
  {itemCode: 'elemental', itemLabel: '元素', itemValue: 'elemental', sortNo: 32, classCode: 'shaman'},
  {itemCode: 'enhancement', itemLabel: '增强', itemValue: 'enhancement', sortNo: 33, classCode: 'shaman'},
  {itemCode: 'restoration_shaman', itemLabel: '恢复', itemValue: 'restoration_shaman', sortNo: 34, classCode: 'shaman'},
  {itemCode: 'affliction', itemLabel: '痛苦', itemValue: 'affliction', sortNo: 35, classCode: 'warlock'},
  {itemCode: 'demonology', itemLabel: '恶魔学识', itemValue: 'demonology', sortNo: 36, classCode: 'warlock'},
  {itemCode: 'destruction', itemLabel: '毁灭', itemValue: 'destruction', sortNo: 37, classCode: 'warlock'},
  {itemCode: 'arms', itemLabel: '武器', itemValue: 'arms', sortNo: 38, classCode: 'warrior'},
  {itemCode: 'fury', itemLabel: '狂怒', itemValue: 'fury', sortNo: 39, classCode: 'warrior'},
  {itemCode: 'protection_warrior', itemLabel: '防护', itemValue: 'protection_warrior', sortNo: 40, classCode: 'warrior'}
]

export const WOW_PRIMARY_PROFESSION_PRESETS = [
  {itemCode: 'alchemy', itemLabel: '炼金术', itemValue: '炼金术', sortNo: 1},
  {itemCode: 'blacksmithing', itemLabel: '锻造', itemValue: '锻造', sortNo: 2},
  {itemCode: 'enchanting', itemLabel: '附魔', itemValue: '附魔', sortNo: 3},
  {itemCode: 'engineering', itemLabel: '工程学', itemValue: '工程学', sortNo: 4},
  {itemCode: 'herbalism', itemLabel: '草药学', itemValue: '草药学', sortNo: 5},
  {itemCode: 'inscription', itemLabel: '铭文', itemValue: '铭文', sortNo: 6},
  {itemCode: 'jewelcrafting', itemLabel: '珠宝加工', itemValue: '珠宝加工', sortNo: 7},
  {itemCode: 'leatherworking', itemLabel: '制皮', itemValue: '制皮', sortNo: 8},
  {itemCode: 'mining', itemLabel: '采矿', itemValue: '采矿', sortNo: 9},
  {itemCode: 'skinning', itemLabel: '剥皮', itemValue: '剥皮', sortNo: 10},
  {itemCode: 'tailoring', itemLabel: '裁缝', itemValue: '裁缝', sortNo: 11}
]

export function getAllowedRaceCodesByClassCode(classCode) {
  return WOW_CLASS_RULES[classCode]?.allowedRaceCodes || []
}

export function getAllowedSpecCodesByClassCode(classCode) {
  return WOW_CLASS_RULES[classCode]?.specCodes || []
}

export function getAllowedFactionsByRaceCode(raceCode) {
  return WOW_RACE_RULES[raceCode]?.factions || [ALLIANCE, HORDE]
}
