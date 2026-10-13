"use strict";
(() => {
  // <define:__ART__>
  var define_ART_default = ["bg_ch1", "c_bear", "e_mushroom", "e_rat", "e_scarecrow", "h_apprentice", "h_barker", "h_costume", "h_stagehand", "h_star"];

  // <define:__CONTENT__>
  var define_CONTENT_default = { params: { battle: { timeLimitSec: 60, gaugeMax: 100, gaugePerAttack: 34, damageVariance: 0.06, rallySec: 8, introSec: 2.5, resultSec: 2 }, member: { baseHp: 120, baseAtk: 12, levelGrowth: 0.08, promoteBonus: 0.1, levelCapPerPromote: 10, levelCostBase: 10, levelCostGrowth: 1.25, shardsToPromote: [2, 3, 5, 8] }, enemy: { baseHp: 90, baseAtk: 3.2, stageGrowth: [1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.17, 1.17, 1.17, 1.17, 1.17, 1.17, 1.17, 1.17, 1.17, 1.17, 1.2, 1.12, 1.12, 1.12, 1.12, 1.34, 1.34, 1.34, 1.34, 1.34, 1.05, 1.05, 1.05, 1.05, 1.05, 1.05, 1.05, 1.05, 1.05, 1.05], chapterHpMult: [], chapterAtkMult: [], count: 5, intervalSec: 1.6, bossHpMult: 7, bossAtkMult: 2.5, bossIntervalSec: 2, bossSkillPower: 0.9 }, economy: { idleGoldBase: 420, idleGoldGrowth: 1.1, idleCapHours: 8, firstClearMinutes: [0.5], ticketStages: [], firstClearMats: 1 }, companion: { levelCap: 30, costMinutesBase: 3, costMinutesGrowth: 1.15, matBase: 5, matGrowth: 1.25, matPerHour: 6, skillGrowth: 0.08 }, dungeon: { sweepsPerDay: 2, kinds: [{ id: "gold", name: "\u304A\u3072\u306D\u308A\u30C0\u30F3\u30B8\u30E7\u30F3", unlockStage: 5, tiers: [{ stage: 3, first: { gold: 500 }, sweep: { gold: 250 } }, { stage: 7, first: { gold: 1200 }, sweep: { gold: 600 } }, { stage: 11, first: { gold: 3e3 }, sweep: { gold: 1500 } }, { stage: 15, first: { gold: 7e3 }, sweep: { gold: 3500 } }, { stage: 19, first: { gold: 15e3 }, sweep: { gold: 7500 } }, { stage: 23, first: { gold: 5e4 }, sweep: { gold: 25e3 } }, { stage: 27, first: { gold: 12e4 }, sweep: { gold: 6e4 } }, { stage: 31, first: { gold: 3e5 }, sweep: { gold: 15e4 } }, { stage: 35, first: { gold: 6e5 }, sweep: { gold: 3e5 } }, { stage: 39, first: { gold: 12e5 }, sweep: { gold: 6e5 } }] }, { id: "mats", name: "\u76F8\u68D2\u306E\u7D20\u6750\u30C0\u30F3\u30B8\u30E7\u30F3", unlockStage: 10, tiers: [{ stage: 3, first: { mats: 6 }, sweep: { mats: 3 } }, { stage: 7, first: { mats: 8 }, sweep: { mats: 4 } }, { stage: 11, first: { mats: 10 }, sweep: { mats: 5 } }, { stage: 15, first: { mats: 12 }, sweep: { mats: 6 } }, { stage: 19, first: { mats: 15 }, sweep: { mats: 7 } }, { stage: 23, first: { mats: 18 }, sweep: { mats: 9 } }, { stage: 27, first: { mats: 21 }, sweep: { mats: 10 } }, { stage: 31, first: { mats: 25 }, sweep: { mats: 12 } }, { stage: 35, first: { mats: 30 }, sweep: { mats: 15 } }, { stage: 39, first: { mats: 35 }, sweep: { mats: 17 } }] }, { id: "equip", name: "\u88C5\u5099\u30C0\u30F3\u30B8\u30E7\u30F3", unlockStage: 15, tiers: [{ stage: 3, first: { equips: 1, equipChapter: 1 }, sweep: { equips: 1, equipChapter: 1 } }, { stage: 7, first: { equips: 2, equipChapter: 1 }, sweep: { equips: 1, equipChapter: 1 } }, { stage: 11, first: { equips: 2, equipChapter: 2 }, sweep: { equips: 1, equipChapter: 2 } }, { stage: 15, first: { equips: 2, equipChapter: 2 }, sweep: { equips: 1, equipChapter: 2 } }, { stage: 19, first: { equips: 3, equipChapter: 2 }, sweep: { equips: 1, equipChapter: 2 } }, { stage: 23, first: { equips: 3, equipChapter: 3 }, sweep: { equips: 2, equipChapter: 3 } }, { stage: 27, first: { equips: 4, equipChapter: 3 }, sweep: { equips: 2, equipChapter: 3 } }, { stage: 31, first: { equips: 4, equipChapter: 3 }, sweep: { equips: 2, equipChapter: 3 } }, { stage: 35, first: { equips: 4, equipChapter: 4 }, sweep: { equips: 3, equipChapter: 4 } }, { stage: 39, first: { equips: 5, equipChapter: 4 }, sweep: { equips: 3, equipChapter: 4 } }] }] }, progress: { chapters: 4, stagesPerChapter: 10 }, recruit: { rarities: { s1: { label: "\u26051", stars: 1, elite: false, statMult: 1, levelCap: 40 }, s2: { label: "\u26052", stars: 2, elite: false, statMult: 1.2, levelCap: 50 }, s3: { label: "\u26053", stars: 3, elite: false, statMult: 1.45, levelCap: 60 }, s3e: { label: "\u26053 \u30A8\u30EA\u30FC\u30C8", stars: 3, elite: true, statMult: 1.7, levelCap: 70 } }, banners: { normal: { label: "\u901A\u5E38\u52E7\u8A98", weights: { s1: 70, s2: 26, s3: 4 }, tenGuaranteeStars: 0, pity: 0, pityStars: 3 }, premium: { label: "\u9AD8\u7D1A\u52E7\u8A98", weights: { s1: 40, s2: 45, s3: 12, s3e: 3 }, tenGuaranteeStars: 2, pity: 60, pityStars: 3 } }, firstPremiumTen: ["h_star", "h_costume"] }, equipment: { rarities: { "1": { stars: 1, bonus: 0.03, bonusPerLevel: 0.015, levelCap: 3, costMult: 1 }, "2": { stars: 2, bonus: 0.06, bonusPerLevel: 0.02, levelCap: 5, costMult: 1.5 }, "3": { stars: 3, bonus: 0.1, bonusPerLevel: 0.025, levelCap: 8, costMult: 2.5 } }, enhanceMinutesBase: 0.4, enhanceMinutesGrowth: 1.35, dropWeights: [[85, 15, 0], [60, 36, 4], [40, 48, 12], [20, 55, 25]], firstClearCount: 1, idleHoursPerItem: 2 } }, members: [{ id: "h_stagehand", name: "\u5927\u9053\u5177\u4FC2", role: "tank", rarity: "s1", hp: 1.5, atk: 0.9, interval: 1.6, trait: "taunt", skill: { type: "selfheal", power: 0.25 }, starter: true }, { id: "h_apprentice", name: "\u898B\u7FD2\u3044\u5F79\u8005", role: "attacker", rarity: "s1", hp: 1, atk: 1.2, interval: 1.5, skill: { type: "strike", power: 3 }, starter: true }, { id: "h_barker", name: "\u547C\u3073\u8FBC\u307F", role: "attacker", rarity: "s1", hp: 0.9, atk: 1, interval: 1.4, skill: { type: "aoe", power: 1 }, starter: true }, { id: "h_ticket", name: "\u5207\u7B26\u3082\u304E\u308A", role: "attacker", rarity: "s1", hp: 0.8, atk: 0.7, interval: 1, trait: "backline", skill: { type: "strike", power: 2 } }, { id: "h_attendant", name: "\u4ED8\u304D\u4EBA", role: "healer", rarity: "s1", hp: 0.9, atk: 0.8, interval: 1.6, skill: { type: "heal", power: 4 } }, { id: "h_clapper", name: "\u62CD\u5B50\u6728\u4FC2", role: "support", rarity: "s1", hp: 0.9, atk: 0.9, interval: 1.5, skill: { type: "rally", power: 0.3 } }, { id: "h_porter", name: "\u8377\u7269\u6301\u3061", role: "tank", rarity: "s1", hp: 1.5, atk: 0.9, interval: 1.6, skill: { type: "selfheal", power: 0.25 } }, { id: "h_cook", name: "\u307E\u304B\u306A\u3044\u4FC2", role: "healer", rarity: "s1", hp: 1, atk: 0.8, interval: 1.6, skill: { type: "healall", power: 1.6 } }, { id: "h_sword", name: "\u6BBA\u9663\u5E2B", role: "attacker", rarity: "s2", hp: 0.9, atk: 1, interval: 1.4, skill: { type: "aoe", power: 1 } }, { id: "h_costume", name: "\u8863\u88C5\u4FC2", role: "healer", rarity: "s2", hp: 0.9, atk: 0.8, interval: 1.6, skill: { type: "heal", power: 4 } }, { id: "h_musician", name: "\u697D\u58EB", role: "support", rarity: "s2", hp: 0.9, atk: 0.9, interval: 1.5, skill: { type: "rally", power: 0.3 } }, { id: "h_clown", name: "\u9053\u5316\u5E2B", role: "attacker", rarity: "s2", hp: 0.8, atk: 0.7, interval: 1, trait: "backline", skill: { type: "strike", power: 2 } }, { id: "h_acrobat", name: "\u8EFD\u696D\u5E2B", role: "attacker", rarity: "s2", hp: 1, atk: 1.2, interval: 1.5, skill: { type: "strike", power: 3 } }, { id: "h_strongman", name: "\u529B\u6301\u3061", role: "tank", rarity: "s2", hp: 1.5, atk: 0.9, interval: 1.6, trait: "taunt", skill: { type: "selfheal", power: 0.25 } }, { id: "h_magician", name: "\u624B\u54C1\u5E2B", role: "attacker", rarity: "s2", hp: 0.9, atk: 1, interval: 1.4, skill: { type: "aoe", power: 1 } }, { id: "h_dancer", name: "\u8E0A\u308A\u5B50", role: "healer", rarity: "s2", hp: 1, atk: 0.8, interval: 1.6, skill: { type: "healall", power: 1.6 } }, { id: "h_star", name: "\u82B1\u5F62\u5F79\u8005", role: "attacker", rarity: "s3", hp: 1, atk: 1.2, interval: 1.5, skill: { type: "strike", power: 3 } }, { id: "h_narrator", name: "\u8A9E\u308A\u90E8", role: "healer", rarity: "s3", hp: 1, atk: 0.8, interval: 1.6, skill: { type: "healall", power: 1.6 } }, { id: "h_puppeteer", name: "\u4EBA\u5F62\u9063\u3044", role: "attacker", rarity: "s3", hp: 0.9, atk: 1, interval: 1.4, skill: { type: "aoe", power: 1 } }, { id: "h_singer", name: "\u6B4C\u59EB", role: "support", rarity: "s3", hp: 0.9, atk: 0.9, interval: 1.5, skill: { type: "rally", power: 0.3 } }, { id: "h_guard", name: "\u7528\u5FC3\u68D2", role: "tank", rarity: "s3", hp: 1.5, atk: 0.9, interval: 1.6, trait: "taunt", skill: { type: "selfheal", power: 0.25 } }, { id: "h_diva", name: "\u770B\u677F\u5973\u512A", role: "attacker", rarity: "s3e", hp: 1, atk: 1.2, interval: 1.5, skill: { type: "strike", power: 3 } }, { id: "h_master", name: "\u5343\u4E21\u5F79\u8005", role: "attacker", rarity: "s3e", hp: 0.9, atk: 1, interval: 1.4, skill: { type: "aoe", power: 1 } }, { id: "h_leader", name: "\u5EA7\u9577", role: "tank", rarity: "s3e", hp: 1.5, atk: 0.9, interval: 1.6, trait: "taunt", skill: { type: "selfheal", power: 0.25 } }], companions: [{ id: "c_bear", name: "\u3082\u308A\u306E\u304F\u307E", chapter: 1, skill: { type: "healall", power: 0.8 }, interval: 9, passiveHp: 0.02, passiveAtk: 0, material: "\u306F\u3061\u307F\u3064" }, { id: "c_ghost", name: "\u3044\u305F\u305A\u3089\u304A\u3070\u3051", chapter: 2, skill: { type: "aoe", power: 1 }, interval: 8, passiveHp: 0, passiveAtk: 0.02, material: "\u304A\u3070\u3051\u30AD\u30E3\u30F3\u30C7\u30A3" }, { id: "c_snow", name: "\u3086\u304D\u3060\u308B\u307E", chapter: 3, skill: { type: "rally", power: 0.25 }, interval: 12, passiveHp: 0.01, passiveAtk: 0.01, material: "\u3053\u304A\u308A\u7802\u7CD6" }, { id: "c_dragon", name: "\u3061\u3073\u30C9\u30E9\u30B4\u30F3", chapter: 4, skill: { type: "strike", power: 4 }, interval: 7, passiveHp: 0, passiveAtk: 0.03, material: "\u307B\u306E\u304A\u306E\u5B9F" }], equipment: [{ id: "e_weapon_1", name: "\u6728\u306E\u5263", slot: "weapon", stars: 1 }, { id: "e_weapon_2", name: "\u821E\u53F0\u306E\u5263", slot: "weapon", stars: 2 }, { id: "e_weapon_3", name: "\u540D\u512A\u306E\u5263", slot: "weapon", stars: 3 }, { id: "e_costume_1", name: "\u7A3D\u53E4\u7740", slot: "costume", stars: 1 }, { id: "e_costume_2", name: "\u821E\u53F0\u8863\u88C5", slot: "costume", stars: 2 }, { id: "e_costume_3", name: "\u5343\u79CB\u697D\u306E\u8863\u88C5", slot: "costume", stars: 3 }, { id: "e_prop_1", name: "\u7D19\u306E\u6247", slot: "prop", stars: 1 }, { id: "e_prop_2", name: "\u7D79\u306E\u6247", slot: "prop", stars: 2 }, { id: "e_prop_3", name: "\u91D1\u306E\u6247", slot: "prop", stars: 3 }, { id: "e_charm_1", name: "\u6728\u306E\u304A\u5B88\u308A", slot: "charm", stars: 1 }, { id: "e_charm_2", name: "\u9280\u306E\u304A\u5B88\u308A", slot: "charm", stars: 2 }, { id: "e_charm_3", name: "\u91D1\u306E\u304A\u5B88\u308A", slot: "charm", stars: 3 }], missions: [{ id: "clear-1", text: "1-1 \u3092\u7A81\u7834\u3059\u308B", kind: "clear", target: 1, reward: { premiumTickets: 10 } }, { id: "recruits-10", text: "\u52E7\u8A98\u3092\u5408\u8A0810\u56DE\u3059\u308B", kind: "recruits", target: 10, reward: { tickets: 5 } }, { id: "party-6", text: "\u7DE8\u6210\u30926\u4EBA\u306B\u3059\u308B", kind: "partySize", target: 6, reward: { tickets: 2 } }, { id: "equip-4", text: "\u7DE8\u6210\u306E\u56E3\u54E1\u306B\u3001\u88C5\u5099\u3092\u5408\u8A084\u3064\u4ED8\u3051\u308B", kind: "equipped", target: 4, reward: { goldMin: 2 } }, { id: "clear-3", text: "1-3 \u3092\u7A81\u7834\u3059\u308B", kind: "clear", target: 3, reward: { tickets: 2 } }, { id: "level-10", text: "\u56E3\u54E1\u306E\u8AB0\u304B\u3092\u30EC\u30D9\u30EB10\u306B\u3059\u308B", kind: "memberLevel", target: 10, reward: { tickets: 2 } }, { id: "idle-1", text: "\u7BB1\u304B\u3089\u53D7\u3051\u53D6\u308B", kind: "idleClaims", target: 1, reward: { tickets: 2 } }, { id: "partylv-40", text: "\u7DE8\u6210\u306E\u30EC\u30D9\u30EB\u306E\u5408\u8A08\u309240\u306B\u3059\u308B", kind: "partyLevel", target: 40, reward: { goldMin: 2 } }, { id: "clear-5", text: "1-5 \u3092\u7A81\u7834\u3059\u308B", kind: "clear", target: 5, reward: { tickets: 2 } }, { id: "recruits-30", text: "\u52E7\u8A98\u3092\u5408\u8A0830\u56DE\u3059\u308B", kind: "recruits", target: 30, reward: { premiumTickets: 3 } }, { id: "reset-1", text: "\u56E3\u54E1\u30921\u56DE\u30EA\u30BB\u30C3\u30C8\u3059\u308B", kind: "resets", target: 1, reward: { goldMin: 2 } }, { id: "promote-1", text: "\u56E3\u54E1\u30921\u56DE\u6607\u683C\u3055\u305B\u308B", kind: "promotes", target: 1, reward: { tickets: 2 } }, { id: "enhance-1", text: "\u88C5\u5099\u30921\u56DE\u5F37\u5316\u3059\u308B", kind: "enhances", target: 1, reward: { goldMin: 2 } }, { id: "clear-7", text: "1-7 \u3092\u7A81\u7834\u3059\u308B", kind: "clear", target: 7, reward: { tickets: 2 } }, { id: "equip-12", text: "\u7DE8\u6210\u306E\u56E3\u54E1\u306B\u3001\u88C5\u5099\u3092\u5408\u8A0812\u3053\u4ED8\u3051\u308B", kind: "equipped", target: 12, reward: { goldMin: 3 } }, { id: "clear-10", text: "1-10 \u306E\u30DC\u30B9\u3092\u5012\u3059", kind: "clear", target: 10, reward: { premiumTickets: 5 } }, { id: "companion-1", text: "\u30DC\u30B9\u3092\u76F8\u68D2\u306B\u3059\u308B", kind: "companions", target: 1, reward: { mats: 5 } }, { id: "companion-equip", text: "\u76F8\u68D2\u3092\u7DE8\u6210\u306B\u5165\u308C\u308B", kind: "companionEquipped", target: 1, reward: { tickets: 2 } }, { id: "companion-lv-1", text: "\u76F8\u68D2\u306E\u30EC\u30D9\u30EB\u30921\u56DE\u4E0A\u3052\u308B", kind: "companionLevelUps", target: 1, reward: { goldMin: 5 } }, { id: "partylv-90", text: "\u7DE8\u6210\u306E\u30EC\u30D9\u30EB\u306E\u5408\u8A08\u309290\u306B\u3059\u308B", kind: "partyLevel", target: 90, reward: { tickets: 2 } }, { id: "clear-12", text: "2-2 \u3092\u7A81\u7834\u3059\u308B", kind: "clear", target: 12, reward: { tickets: 2 } }, { id: "dungeon-3", text: "\u3069\u308C\u304B\u306E\u30C0\u30F3\u30B8\u30E7\u30F3\u3067\u3001\u6BB5\u968E3\u3092\u7A81\u7834\u3059\u308B", kind: "dungeonTier", target: 3, reward: { tickets: 3 } }, { id: "level-20", text: "\u56E3\u54E1\u306E\u8AB0\u304B\u3092\u30EC\u30D9\u30EB20\u306B\u3059\u308B", kind: "memberLevel", target: 20, reward: { goldMin: 4 } }, { id: "recruits-50", text: "\u52E7\u8A98\u3092\u5408\u8A0850\u56DE\u3059\u308B", kind: "recruits", target: 50, reward: { premiumTickets: 3 } }, { id: "clear-15", text: "2-5 \u3092\u7A81\u7834\u3059\u308B", kind: "clear", target: 15, reward: { tickets: 2 } }, { id: "enhance-10", text: "\u88C5\u5099\u3092\u5408\u8A0810\u56DE\u5F37\u5316\u3059\u308B", kind: "enhances", target: 10, reward: { tickets: 2 } }, { id: "promote-3", text: "\u56E3\u54E1\u3092\u5408\u8A083\u56DE\u6607\u683C\u3055\u305B\u308B", kind: "promotes", target: 3, reward: { tickets: 2 } }, { id: "clear-18", text: "2-8 \u3092\u7A81\u7834\u3059\u308B", kind: "clear", target: 18, reward: { tickets: 2 } }, { id: "dungeon-5", text: "\u3069\u308C\u304B\u306E\u30C0\u30F3\u30B8\u30E7\u30F3\u3067\u3001\u6BB5\u968E5\u3092\u7A81\u7834\u3059\u308B", kind: "dungeonTier", target: 5, reward: { tickets: 5 } }, { id: "equip-24", text: "\u7DE8\u6210\u306E\u56E3\u54E1\u306B\u3001\u88C5\u5099\u3092\u5408\u8A0824\u3053\u4ED8\u3051\u308B", kind: "equipped", target: 24, reward: { goldMin: 5 } }, { id: "partylv-150", text: "\u7DE8\u6210\u306E\u30EC\u30D9\u30EB\u306E\u5408\u8A08\u3092150\u306B\u3059\u308B", kind: "partyLevel", target: 150, reward: { tickets: 2 } }, { id: "clear-20", text: "2-10 \u306E\u30DC\u30B9\u3092\u5012\u3059", kind: "clear", target: 20, reward: { premiumTickets: 5 } }, { id: "companion-2", text: "\u76F8\u68D2\u30922\u4F53\u306B\u3059\u308B", kind: "companions", target: 2, reward: { mats: 5 } }, { id: "level-30", text: "\u56E3\u54E1\u306E\u8AB0\u304B\u3092\u30EC\u30D9\u30EB30\u306B\u3059\u308B", kind: "memberLevel", target: 30, reward: { goldMin: 5 } }, { id: "recruits-100", text: "\u52E7\u8A98\u3092\u5408\u8A08100\u56DE\u3059\u308B", kind: "recruits", target: 100, reward: { premiumTickets: 10 } }, { id: "clear-23", text: "3-3 \u3092\u7A81\u7834\u3059\u308B", kind: "clear", target: 23, reward: { tickets: 2 } }, { id: "companion-lv-5", text: "\u76F8\u68D2\u306E\u30EC\u30D9\u30EB\u3092\u5408\u8A085\u56DE\u4E0A\u3052\u308B", kind: "companionLevelUps", target: 5, reward: { tickets: 2 } }, { id: "clear-25", text: "3-5 \u3092\u7A81\u7834\u3059\u308B", kind: "clear", target: 25, reward: { tickets: 5 } }, { id: "promote-6", text: "\u56E3\u54E1\u3092\u5408\u8A086\u56DE\u6607\u683C\u3055\u305B\u308B", kind: "promotes", target: 6, reward: { tickets: 2 } }, { id: "enhance-30", text: "\u88C5\u5099\u3092\u5408\u8A0830\u56DE\u5F37\u5316\u3059\u308B", kind: "enhances", target: 30, reward: { tickets: 5 } }, { id: "clear-28", text: "3-8 \u3092\u7A81\u7834\u3059\u308B", kind: "clear", target: 28, reward: { tickets: 5 } }, { id: "clear-30", text: "3-10 \u306E\u30DC\u30B9\u3092\u5012\u3059", kind: "clear", target: 30, reward: { premiumTickets: 5 } }, { id: "companion-3", text: "\u76F8\u68D2\u30923\u4F53\u306B\u3059\u308B", kind: "companions", target: 3, reward: { mats: 5 } }, { id: "recruits-150", text: "\u52E7\u8A98\u3092\u5408\u8A08150\u56DE\u3059\u308B", kind: "recruits", target: 150, reward: { premiumTickets: 10 } }, { id: "level-40", text: "\u56E3\u54E1\u306E\u8AB0\u304B\u3092\u30EC\u30D9\u30EB40\u306B\u3059\u308B", kind: "memberLevel", target: 40, reward: { tickets: 5 } }, { id: "clear-35", text: "4-5 \u3092\u7A81\u7834\u3059\u308B", kind: "clear", target: 35, reward: { tickets: 10 } }, { id: "recruits-200", text: "\u52E7\u8A98\u3092\u5408\u8A08200\u56DE\u3059\u308B", kind: "recruits", target: 200, reward: { premiumTickets: 10 } }, { id: "clear-40", text: "4-10 \u306E\u30DC\u30B9\u3092\u5012\u3059", kind: "clear", target: 40, reward: { premiumTickets: 10 } }, { id: "dungeon-10", text: "\u3069\u308C\u304B\u306E\u30C0\u30F3\u30B8\u30E7\u30F3\u3067\u3001\u6BB5\u968E10\u3092\u7A81\u7834\u3059\u308B", kind: "dungeonTier", target: 10, reward: { premiumTickets: 3 } }], dailies: [{ id: "d-idle", text: "\u7BB1\u304B\u3089\u53D7\u3051\u53D6\u308B", kind: "idleClaims", target: 1, reward: { goldMin: 10 } }, { id: "d-challenge", text: "3\u56DE\u6311\u6226\u3059\u308B", kind: "challenges", target: 3, reward: { goldMin: 10 } }, { id: "d-train", text: "\u56E3\u54E1\u306E\u30EC\u30D9\u30EB\u3092\u5408\u8A0810\u4E0A\u3052\u308B", kind: "levelUps", target: 10, reward: { mats: 3 } }, { id: "d-sweep", text: "\u30C0\u30F3\u30B8\u30E7\u30F3\u3067\u6E05\u6383\u30922\u56DE\u3059\u308B", kind: "sweeps", target: 2, reward: { goldMin: 10 } }, { id: "d-enhance", text: "\u88C5\u5099\u30921\u56DE\u5F37\u5316\u3059\u308B", kind: "enhances", target: 1, reward: { tickets: 2 } }, { id: "d-all", text: "\u65E5\u8AB2\u30923\u3064\u9054\u6210\u3059\u308B", kind: "dailyClaims", target: 3, reward: { premiumTickets: 1 } }] };

  // src/core/params.ts
  var EQUIP_SLOTS = ["weapon", "costume", "prop", "charm"];
  var EQUIP_STAT = { weapon: "atk", costume: "hp", prop: "atk", charm: "hp" };
  function index(list, what) {
    const out = {};
    for (const item of list) {
      if (out[item.id]) throw new Error(`${what}\u306EID\u304C\u91CD\u8907\u3057\u3066\u3044\u307E\u3059: ${item.id}`);
      out[item.id] = item;
    }
    return out;
  }
  function buildContent(data) {
    const { params, members, companions, equipment, missions, dailies } = data;
    const byId = index(members, "\u56E3\u54E1");
    const companionById = index(companions, "\u76F8\u68D2");
    const equipById = index(equipment, "\u88C5\u5099");
    index(missions, "\u30DF\u30C3\u30B7\u30E7\u30F3");
    index(dailies, "\u65E5\u8AB2");
    for (const id of Object.keys(companionById)) {
      if (byId[id]) throw new Error(`\u56E3\u54E1\u3068\u76F8\u68D2\u3067ID\u304C\u91CD\u8907\u3057\u3066\u3044\u307E\u3059: ${id}`);
    }
    if (members.filter((m) => m.starter).length === 0) throw new Error("\u6700\u521D\u304B\u3089\u6301\u3063\u3066\u3044\u308B\u56E3\u54E1\u304C\u3044\u307E\u305B\u3093");
    for (const m of members) {
      if (!params.recruit.rarities[m.rarity]) throw new Error(`\u56E3\u54E1 ${m.id} \u306E\u30EC\u30A2\u5EA6\u304C\u5B9A\u7FA9\u3055\u308C\u3066\u3044\u307E\u305B\u3093: ${m.rarity}`);
    }
    const dungeonIds = /* @__PURE__ */ new Set();
    for (const d of params.dungeon.kinds) {
      if (dungeonIds.has(d.id)) throw new Error(`\u30C0\u30F3\u30B8\u30E7\u30F3\u306EID\u304C\u91CD\u8907\u3057\u3066\u3044\u307E\u3059: ${d.id}`);
      dungeonIds.add(d.id);
      if (d.tiers.length === 0) throw new Error(`\u30C0\u30F3\u30B8\u30E7\u30F3 ${d.id} \u306B\u6BB5\u968E\u304C\u3042\u308A\u307E\u305B\u3093`);
      for (const t of d.tiers) {
        if (!Number.isInteger(t.stage) || t.stage < 1) throw new Error(`\u30C0\u30F3\u30B8\u30E7\u30F3 ${d.id} \u306E\u6BB5\u968E\u306E\u5F37\u3055\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093`);
      }
    }
    for (const id of params.recruit.firstPremiumTen) {
      if (!byId[id]) throw new Error(`\u6700\u521D\u306E\u9AD8\u7D1A10\u9023\u3067\u51FA\u308B\u56E3\u54E1\u304C\u3044\u307E\u305B\u3093: ${id}`);
    }
    for (const [name, banner] of Object.entries(params.recruit.banners)) {
      const usable = Object.keys(banner.weights).filter((r) => (banner.weights[r] ?? 0) > 0);
      if (usable.length === 0) throw new Error(`\u52E7\u8A98\u300C${name}\u300D\u304B\u3089\u51FA\u308B\u30EC\u30A2\u5EA6\u304C\u3042\u308A\u307E\u305B\u3093`);
      for (const r of usable) {
        if (!params.recruit.rarities[r]) throw new Error(`\u52E7\u8A98\u300C${name}\u300D\u306E\u30EC\u30A2\u5EA6\u304C\u5B9A\u7FA9\u3055\u308C\u3066\u3044\u307E\u305B\u3093: ${r}`);
        if (!members.some((m) => m.rarity === r)) throw new Error(`\u52E7\u8A98\u300C${name}\u300D\u306E\u30EC\u30A2\u5EA6 ${r} \u306B\u3001\u56E3\u54E1\u304C\u3044\u307E\u305B\u3093`);
      }
    }
    for (const e of equipment) {
      if (!params.equipment.rarities[String(e.stars)]) throw new Error(`\u88C5\u5099 ${e.id} \u306E \u2605 \u304C\u5B9A\u7FA9\u3055\u308C\u3066\u3044\u307E\u305B\u3093: ${e.stars}`);
      if (!EQUIP_SLOTS.includes(e.slot)) throw new Error(`\u88C5\u5099 ${e.id} \u306E\u5834\u6240\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093: ${String(e.slot)}`);
    }
    return { params, members, byId, companions, companionById, equipment, equipById, missions, dailies };
  }
  function powInt(base, n) {
    let out = 1;
    for (let i = 0; i < n; i++) out *= base;
    return out;
  }
  function totalStages(p) {
    return p.progress.chapters * p.progress.stagesPerChapter;
  }
  function isBossStage(stage, p) {
    return stage % p.progress.stagesPerChapter === 0;
  }
  function chapterOf(stage, p) {
    return Math.floor((stage - 1) / p.progress.stagesPerChapter) + 1;
  }
  function stageLabel(stage, p) {
    return `${chapterOf(stage, p)}-${(stage - 1) % p.progress.stagesPerChapter + 1}`;
  }
  function enemyGrowth(stage, p) {
    const table = p.enemy.stageGrowth;
    let out = 1;
    for (let s = 2; s <= stage; s++) {
      out *= table.length === 0 ? 1 : table[Math.min(s - 1, table.length) - 1];
    }
    return out;
  }
  function idleGoldPerMin(highestCleared, p) {
    return p.economy.idleGoldBase * powInt(p.economy.idleGoldGrowth, Math.max(0, highestCleared - 1));
  }
  function firstClearGold(stage, p) {
    const table = p.economy.firstClearMinutes;
    const minutes = table.length === 0 ? 0 : table[Math.min(stage, table.length) - 1];
    return Math.round(idleGoldPerMin(stage, p) * minutes);
  }
  function levelCost(level, p) {
    return Math.round(p.member.levelCostBase * powInt(p.member.levelCostGrowth, level - 1));
  }
  function levelCostTo(from, to, p) {
    let sum = 0;
    for (let l = from; l < to; l++) sum += levelCost(l, p);
    return sum;
  }
  function levelCap(def, plus, p) {
    return (p.recruit.rarities[def.rarity]?.levelCap ?? 1) + p.member.levelCapPerPromote * plus;
  }
  function maxPlus(p) {
    return p.member.shardsToPromote.length;
  }
  function memberStats(def, level, plus, p) {
    const rarity = p.recruit.rarities[def.rarity]?.statMult ?? 1;
    const grow = powInt(1 + p.member.levelGrowth, level - 1) * (1 + p.member.promoteBonus * plus) * rarity;
    return {
      hp: Math.round(p.member.baseHp * def.hp * grow),
      atk: Math.round(p.member.baseAtk * def.atk * grow)
    };
  }
  function powerOf(stats, interval) {
    return Math.round(stats.hp * 0.2 + stats.atk / interval * 6);
  }
  function companionMatCost(level, p) {
    return Math.round(p.companion.matBase * powInt(p.companion.matGrowth, level - 1));
  }
  function companionCostMinutes(level, p) {
    return p.companion.costMinutesBase * powInt(p.companion.costMinutesGrowth, level - 1);
  }
  function companionSkillPower(def, level, p) {
    return def.skill.power * (1 + p.companion.skillGrowth * (level - 1));
  }
  function equipBonus(def, level, p) {
    const r = p.equipment.rarities[String(def.stars)];
    return r ? r.bonus + r.bonusPerLevel * level : 0;
  }
  function equipLevelCap(def, p) {
    return p.equipment.rarities[String(def.stars)]?.levelCap ?? 0;
  }
  function equipEnhanceMinutes(def, level, p) {
    const mult = p.equipment.rarities[String(def.stars)]?.costMult ?? 1;
    return p.equipment.enhanceMinutesBase * powInt(p.equipment.enhanceMinutesGrowth, level) * mult;
  }
  function equipDropWeights(chapter, p) {
    const table = p.equipment.dropWeights;
    return table.length === 0 ? [1] : table[Math.min(chapter, table.length) - 1];
  }

  // src/core/rng.ts
  function createRng(seed) {
    let s = seed >>> 0;
    const next = () => {
      s = s + 1831565813 >>> 0;
      let t = s;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
    return {
      next,
      int(min, max) {
        if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
          throw new Error(`int(${min}, ${max}) \u306E\u7BC4\u56F2\u304C\u4E0D\u6B63\u3067\u3059`);
        }
        return min + Math.floor(next() * (max - min + 1));
      },
      state: () => s
    };
  }

  // src/core/battle.ts
  function runBattle(allies, enemies, bp, rng, record, companion = null) {
    const make = (spec, side, index2) => ({
      side,
      index: index2,
      row: spec.row,
      maxHp: spec.hp,
      hp: spec.hp,
      atk: spec.atk,
      interval: spec.interval,
      skill: spec.skill,
      trait: spec.trait ?? null,
      gauge: 0,
      // 味方が少し先に動く。同じ側の中では、番号の順に少しずつずらす。
      nextAt: spec.interval * (side === 0 ? 0.5 : 0.9) + index2 * 0.07,
      rallyUntil: -1,
      rallyMult: 1
    });
    const all = [...allies.map((s, i) => make(s, 0, i)), ...enemies.map((s, i) => make(s, 1, i))];
    const events2 = [];
    const push2 = (e) => {
      if (record) events2.push(e);
    };
    const alive = (side) => all.filter((f) => f.side === side && f.hp > 0);
    const damageOf = (actor, base, t2) => {
      const rally = actor.rallyUntil >= t2 ? actor.rallyMult : 1;
      const spread = 1 + bp.damageVariance * (2 * rng.next() - 1);
      return Math.max(1, Math.round(base * rally * spread));
    };
    const hit = (actor, target, base, kind, t2) => {
      const amount = damageOf(actor, base, t2);
      target.hp = Math.max(0, target.hp - amount);
      push2({ t: t2, side: actor.side, actor: actor.index, kind, targetSide: target.side, target: target.index, amount });
      if (target.hp === 0) {
        push2({ t: t2, side: target.side, actor: target.index, kind: "down", targetSide: target.side, target: target.index, amount: 0 });
      }
    };
    const heal = (actor, target, base, kind, t2) => {
      const amount = Math.min(target.maxHp - target.hp, Math.max(1, Math.round(base)));
      target.hp += amount;
      push2({ t: t2, side: actor.side, actor: actor.index, kind, targetSide: target.side, target: target.index, amount });
    };
    const pickTarget = (actor, foes) => {
      let pool = foes.filter((f) => f.trait === "taunt");
      if (pool.length === 0) {
        const wanted = actor.trait === "backline" ? 1 : 0;
        pool = foes.filter((f) => f.row === wanted);
      }
      if (pool.length === 0) pool = foes;
      let target = pool[0];
      for (const f of pool) if (f.hp < target.hp) target = f;
      return target;
    };
    let companionAt = companion === null ? Infinity : companion.interval;
    const companionAct = (c, t2) => {
      const actor = { side: 0, index: -1, row: 1, maxHp: 1, hp: 1, atk: c.atk, interval: c.interval, skill: c.skill, trait: null, gauge: 0, nextAt: 0, rallyUntil: -1, rallyMult: 1 };
      const foes = alive(1);
      const friends = alive(0);
      const s = c.skill;
      if (s.type === "strike") {
        hit(actor, pickTarget(actor, foes), c.atk * s.power, "strike", t2);
      } else if (s.type === "aoe") {
        for (const f of foes) hit(actor, f, c.atk * s.power, "aoe", t2);
      } else if (s.type === "rally") {
        for (const f of friends) {
          f.rallyUntil = t2 + bp.rallySec;
          f.rallyMult = 1 + s.power;
        }
        push2({ t: t2, side: 0, actor: -1, kind: "rally", targetSide: 0, target: -1, amount: 0 });
      } else {
        for (const f of friends) heal(actor, f, c.atk * s.power, "healall", t2);
      }
    };
    let t = 0;
    let timedOut = false;
    while (true) {
      let cur = null;
      for (const f of all) {
        if (f.hp > 0 && (cur === null || f.nextAt < cur.nextAt)) cur = f;
      }
      if (cur === null) break;
      if (companion !== null && companionAt <= cur.nextAt && companionAt <= bp.timeLimitSec) {
        t = companionAt;
        companionAct(companion, t);
        companionAt = t + companion.interval;
        if (alive(0).length === 0 || alive(1).length === 0) break;
        continue;
      }
      if (cur.nextAt > bp.timeLimitSec) {
        t = bp.timeLimitSec;
        timedOut = true;
        break;
      }
      t = cur.nextAt;
      const foeSide = cur.side === 0 ? 1 : 0;
      const foes = alive(foeSide);
      const friends = alive(cur.side);
      if (foes.length === 0) break;
      if (cur.skill !== null && cur.gauge >= bp.gaugeMax) {
        cur.gauge = 0;
        const s = cur.skill;
        if (s.type === "strike") {
          hit(cur, pickTarget(cur, foes), cur.atk * s.power, "strike", t);
        } else if (s.type === "aoe") {
          for (const f of foes) hit(cur, f, cur.atk * s.power, "aoe", t);
        } else if (s.type === "heal") {
          let target = friends[0];
          for (const f of friends) if (f.hp / f.maxHp < target.hp / target.maxHp) target = f;
          heal(cur, target, cur.atk * s.power, "heal", t);
        } else if (s.type === "healall") {
          for (const f of friends) heal(cur, f, cur.atk * s.power, "healall", t);
        } else if (s.type === "selfheal") {
          heal(cur, cur, cur.maxHp * s.power, "selfheal", t);
        } else {
          for (const f of friends) {
            f.rallyUntil = t + bp.rallySec;
            f.rallyMult = 1 + s.power;
          }
          push2({ t, side: cur.side, actor: cur.index, kind: "rally", targetSide: cur.side, target: -1, amount: 0 });
        }
      } else {
        cur.gauge += bp.gaugePerAttack;
        hit(cur, pickTarget(cur, foes), cur.atk, "attack", t);
      }
      cur.nextAt = t + cur.interval;
      if (alive(0).length === 0 || alive(1).length === 0) break;
    }
    const allyHp = all.filter((f) => f.side === 0).map((f) => f.hp);
    const enemyHp = all.filter((f) => f.side === 1).map((f) => f.hp);
    const win = !timedOut && enemyHp.every((h) => h === 0) && allyHp.some((h) => h > 0);
    return { win, timedOut, durationSec: Math.round(t * 100) / 100, events: events2, allyHp, enemyHp };
  }

  // src/core/game.ts
  var GAME_VERSION = 3;
  var PARTY_SIZE = 6;
  var FRONT_SIZE = PARTY_SIZE / 2;
  var COUNTER_KEYS = ["challenges", "levelUps", "recruits", "promotes", "resets", "idleClaims", "companionLevelUps", "enhances"];
  function zeroCounters() {
    return { challenges: 0, levelUps: 0, recruits: 0, promotes: 0, resets: 0, idleClaims: 0, companionLevelUps: 0, enhances: 0 };
  }
  function cloneDungeons(d) {
    const out = {};
    for (const k of Object.keys(d ?? {})) out[k] = { ...d[k] };
    return out;
  }
  function clone(g) {
    const members = {};
    for (const id of Object.keys(g.members)) members[id] = { ...g.members[id] };
    const companions = {};
    for (const id of Object.keys(g.companions)) companions[id] = { ...g.companions[id] };
    return {
      ...g,
      members,
      party: g.party.slice(),
      companions,
      materials: { ...g.materials },
      equips: g.equips.map((e) => ({ ...e })),
      battle: g.battle ? { ...g.battle } : null,
      idle: { ...g.idle, mats: { ...g.idle.mats } },
      counters: { ...g.counters },
      recruit: { ...g.recruit, pity: { ...g.recruit.pity } },
      missionsClaimed: g.missionsClaimed.slice(),
      daily: { ...g.daily, counters: { ...g.daily.counters }, claimed: g.daily.claimed.slice() },
      dungeons: cloneDungeons(g.dungeons),
      stats: { ...g.stats }
    };
  }
  var ROLE_ORDER = { tank: 0, attacker: 1, support: 2, healer: 3 };
  function createGame(nowMs, seed, ctx2) {
    const starters = ctx2.members.filter((m) => m.starter).sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);
    const members = {};
    const party = [];
    for (const m of starters) {
      members[m.id] = { level: 1, plus: 0, shards: 0 };
      if (party.length < PARTY_SIZE) party.push(m.id);
    }
    while (party.length < PARTY_SIZE) party.push(null);
    return {
      v: GAME_VERSION,
      startedAtMs: nowMs,
      lastActiveMs: nowMs,
      gold: 0,
      tickets: 0,
      premiumTickets: 0,
      members,
      party,
      companions: {},
      companionSlot: null,
      materials: {},
      equips: [],
      nextEquipUid: 1,
      highestCleared: 0,
      battle: null,
      idle: { windowStartMs: nowMs, anchorMs: nowMs, gold: 0, mats: {}, equip: 0 },
      counters: zeroCounters(),
      recruit: { pity: {}, firstTenDone: false },
      missionsClaimed: [],
      daily: { dayKey: -1, counters: zeroCounters(), claims: 0, claimed: [] },
      dungeons: {},
      rngState: seed >>> 0,
      stats: {
        battles: 0,
        wins: 0,
        defeats: 0,
        actions: 0,
        firstDefeatAtMs: null,
        firstCompanionAtMs: null,
        partyFullAtMs: party.every((x) => x !== null) ? nowMs : null,
        lastProgressAtMs: nowMs,
        longestStallMs: 0
      }
    };
  }
  function allCleared(g, ctx2) {
    return g.highestCleared >= totalStages(ctx2.params);
  }
  function nextStage(g, ctx2) {
    return allCleared(g, ctx2) ? null : g.highestCleared + 1;
  }
  function ownedCount(g) {
    return Object.keys(g.members).length;
  }
  function passiveMult(g, ctx2) {
    let hp = 1;
    let atk = 1;
    for (const id of Object.keys(g.companions)) {
      const def = ctx2.companionById[id];
      const own = g.companions[id];
      if (!def || !own) continue;
      hp += def.passiveHp * own.level;
      atk += def.passiveAtk * own.level;
    }
    return { hp, atk };
  }
  function equippedOn(g, memberId, ctx2) {
    const out = { weapon: null, costume: null, prop: null, charm: null };
    for (const e of g.equips) {
      if (e.on !== memberId) continue;
      const def = ctx2.equipById[e.defId];
      if (def) out[def.slot] = e;
    }
    return out;
  }
  function equipMult(g, memberId, ctx2) {
    let hp = 1;
    let atk = 1;
    for (const e of g.equips) {
      if (e.on !== memberId) continue;
      const def = ctx2.equipById[e.defId];
      if (!def) continue;
      const bonus = equipBonus(def, e.level, ctx2.params);
      if (EQUIP_STAT[def.slot] === "hp") hp += bonus;
      else atk += bonus;
    }
    return { hp, atk };
  }
  function equippedCount(g) {
    let n = 0;
    for (const e of g.equips) if (e.on !== null && g.party.includes(e.on)) n += 1;
    return n;
  }
  function enemySpecs(stage, ctx2) {
    const p = ctx2.params;
    const grow = enemyGrowth(stage, p);
    const chapter = chapterOf(stage, p);
    const baseHp = p.enemy.baseHp * grow * (p.enemy.chapterHpMult[chapter - 1] ?? 1);
    const baseAtk = p.enemy.baseAtk * grow * (p.enemy.chapterAtkMult[chapter - 1] ?? 1);
    if (isBossStage(stage, p)) {
      const def = ctx2.companions.find((c) => c.chapter === chapter);
      return [
        {
          key: def ? def.id : `boss-${chapter}`,
          row: 0,
          hp: Math.round(baseHp * p.enemy.bossHpMult),
          atk: Math.round(baseAtk * p.enemy.bossAtkMult),
          interval: p.enemy.bossIntervalSec,
          skill: { type: "aoe", power: p.enemy.bossSkillPower }
        }
      ];
    }
    const specs = [];
    const front = Math.ceil(p.enemy.count / 2);
    for (let i = 0; i < p.enemy.count; i++) {
      specs.push({
        key: `enemy-${(stage + i) % 6 + 1}`,
        row: i < front ? 0 : 1,
        hp: Math.round(baseHp),
        atk: Math.round(baseAtk),
        interval: p.enemy.intervalSec,
        skill: null
      });
    }
    return specs;
  }
  function battleStats(g, id, ctx2) {
    const def = ctx2.byId[id];
    const own = g.members[id];
    if (!def || !own) return null;
    const s = memberStats(def, own.level, own.plus, ctx2.params);
    const m = passiveMult(g, ctx2);
    const e = equipMult(g, id, ctx2);
    return { hp: Math.round(s.hp * m.hp * e.hp), atk: Math.round(s.atk * m.atk * e.atk) };
  }
  function memberPowerNow(g, id, ctx2) {
    const def = ctx2.byId[id];
    const s = battleStats(g, id, ctx2);
    return def && s ? powerOf(s, def.interval) : 0;
  }
  function allySpecs(g, ctx2) {
    const specs = [];
    g.party.forEach((id, slot) => {
      if (id === null) return;
      const def = ctx2.byId[id];
      const s = battleStats(g, id, ctx2);
      if (!def || !s) return;
      specs.push({ key: id, row: slot < FRONT_SIZE ? 0 : 1, hp: s.hp, atk: s.atk, interval: def.interval, skill: def.skill, trait: def.trait ?? null });
    });
    return specs;
  }
  function companionSpec(g, ctx2) {
    const id = g.companionSlot;
    if (id === null) return null;
    const def = ctx2.companionById[id];
    const own = g.companions[id];
    if (!def || !own) return null;
    const allies = allySpecs(g, ctx2);
    if (allies.length === 0) return null;
    const avgAtk = allies.reduce((a, s) => a + s.atk, 0) / allies.length;
    return { key: id, atk: avgAtk, interval: def.interval, skill: { type: def.skill.type, power: companionSkillPower(def, own.level, ctx2.params) } };
  }
  function partyPower(g, ctx2) {
    let sum = 0;
    for (const id of g.party) if (id !== null) sum += memberPowerNow(g, id, ctx2);
    return sum;
  }
  function nextGoals(g, ctx2) {
    const p = ctx2.params;
    if (allCleared(g, ctx2)) return { bossIn: null, bossStage: null };
    const next = g.highestCleared + 1;
    const bossStage = Math.ceil(next / p.progress.stagesPerChapter) * p.progress.stagesPerChapter;
    return { bossIn: bossStage - g.highestCleared, bossStage };
  }
  function rewardAmounts(g, reward, ctx2) {
    const rate = idleGoldPerMin(Math.max(1, g.highestCleared), ctx2.params);
    return {
      gold: Math.round((reward.gold ?? 0) + (reward.goldMin ?? 0) * rate),
      tickets: reward.tickets ?? 0,
      premiumTickets: reward.premiumTickets ?? 0,
      mats: reward.mats ?? 0
    };
  }
  function grant(g, amounts) {
    g.gold += amounts.gold;
    g.tickets += amounts.tickets;
    g.premiumTickets += amounts.premiumTickets;
    if (amounts.mats > 0) {
      for (const id of Object.keys(g.companions)) g.materials[id] = (g.materials[id] ?? 0) + amounts.mats;
    }
  }
  function pick(items, weight, roll) {
    const total = items.reduce((a, x) => a + weight(x), 0);
    let left = roll * total;
    for (const item of items) {
      left -= weight(item);
      if (left < 0) return item;
    }
    return items[items.length - 1];
  }
  function rollEquip(g, chapter, ctx2, rng) {
    const weights = equipDropWeights(chapter, ctx2.params);
    const starsList = weights.map((_, i) => i + 1).filter((stars2) => (weights[stars2 - 1] ?? 0) > 0 && ctx2.equipment.some((d) => d.stars === stars2));
    if (starsList.length === 0) return null;
    const stars = pick(starsList, (s) => weights[s - 1] ?? 0, rng.next());
    const defs = ctx2.equipment.filter((d) => d.stars === stars);
    const def = pick(defs, () => 1, rng.next());
    const item = { uid: g.nextEquipUid, defId: def.id, level: 0, on: null };
    g.nextEquipUid += 1;
    g.equips.push(item);
    return item;
  }
  function accrue(g, toMs, ctx2) {
    const p = ctx2.params;
    const end = Math.min(toMs, g.idle.windowStartMs + p.economy.idleCapHours * 36e5);
    const dt = end - g.idle.anchorMs;
    if (dt <= 0) return;
    g.idle.gold += idleGoldPerMin(g.highestCleared, p) * dt / 6e4;
    for (const id of Object.keys(g.companions)) {
      g.idle.mats[id] = (g.idle.mats[id] ?? 0) + p.companion.matPerHour * dt / 36e5;
    }
    if (p.equipment.idleHoursPerItem > 0) g.idle.equip += dt / (p.equipment.idleHoursPerItem * 36e5);
    g.idle.anchorMs = end;
  }
  function idlePending(g, nowMs, ctx2) {
    const c = clone(g);
    accrue(c, nowMs, ctx2);
    const mats = {};
    for (const id of Object.keys(c.idle.mats)) mats[id] = Math.floor(c.idle.mats[id] ?? 0);
    const capMs = ctx2.params.economy.idleCapHours * 36e5;
    const elapsedMs = Math.max(0, Math.min(nowMs - g.idle.windowStartMs, capMs));
    return {
      gold: Math.floor(c.idle.gold),
      mats,
      equips: Math.floor(c.idle.equip + 1e-9),
      ratePerMin: idleGoldPerMin(g.highestCleared, ctx2.params),
      capped: nowMs - g.idle.windowStartMs >= capMs,
      elapsedMs
    };
  }
  function collectIdle(game, nowMs, ctx2) {
    const g = clone(game);
    accrue(g, nowMs, ctx2);
    const gold = Math.floor(g.idle.gold);
    const mats = {};
    let any = gold > 0;
    for (const id of Object.keys(g.idle.mats)) {
      const n = Math.floor(g.idle.mats[id] ?? 0);
      if (n > 0) {
        mats[id] = n;
        any = true;
      }
    }
    const count = Math.floor(g.idle.equip + 1e-9);
    if (count > 0) any = true;
    if (!any) return { game, ok: false, reason: "\u307E\u3060\u8CAF\u307E\u3063\u3066\u3044\u307E\u305B\u3093" };
    g.gold += gold;
    g.idle.gold -= gold;
    for (const id of Object.keys(mats)) {
      g.materials[id] = (g.materials[id] ?? 0) + mats[id];
      g.idle.mats[id] = (g.idle.mats[id] ?? 0) - mats[id];
    }
    const equips = [];
    if (count > 0) {
      const rng = createRng(g.rngState);
      const chapter = chapterOf(Math.max(1, g.highestCleared), ctx2.params);
      for (let i = 0; i < count; i++) {
        const item = rollEquip(g, chapter, ctx2, rng);
        if (item) equips.push({ ...item });
      }
      g.rngState = rng.state();
      g.idle.equip = Math.max(0, g.idle.equip - count);
    }
    g.idle.windowStartMs = Math.max(nowMs, g.idle.anchorMs);
    g.idle.anchorMs = g.idle.windowStartMs;
    g.counters.idleClaims += 1;
    g.daily.counters.idleClaims += 1;
    g.stats.actions += 1;
    return { game: g, ok: true, gold, mats, equips };
  }
  function resolveBattle(g, ctx2, events2) {
    const b = g.battle;
    if (!b) return;
    const p = ctx2.params;
    const atMs = b.resolveAtMs;
    g.battle = null;
    if (b.dungeon) {
      resolveDungeon(g, b.dungeon.kind, b.dungeon.tier, b.win, b.timedOut, atMs, ctx2, events2);
      return;
    }
    if (!b.win) {
      g.stats.defeats += 1;
      if (g.stats.firstDefeatAtMs === null) g.stats.firstDefeatAtMs = atMs;
      events2.push({ type: "defeat", atMs, stage: b.stage, timedOut: b.timedOut });
      return;
    }
    g.stats.wins += 1;
    if (b.stage <= g.highestCleared) return;
    accrue(g, atMs, ctx2);
    const reward = {
      gold: firstClearGold(b.stage, p),
      tickets: p.economy.ticketStages.includes(b.stage) ? 1 : 0,
      premiumTickets: 0,
      mats: Object.keys(g.companions).length > 0 ? p.economy.firstClearMats : 0
    };
    grant(g, reward);
    let equipDefId = null;
    if (p.equipment.firstClearCount > 0) {
      const rng = createRng(g.rngState);
      for (let i = 0; i < p.equipment.firstClearCount; i++) {
        const item = rollEquip(g, chapterOf(b.stage, p), ctx2, rng);
        if (item && equipDefId === null) equipDefId = item.defId;
      }
      g.rngState = rng.state();
    }
    g.highestCleared = b.stage;
    g.stats.longestStallMs = Math.max(g.stats.longestStallMs, atMs - g.stats.lastProgressAtMs);
    g.stats.lastProgressAtMs = atMs;
    events2.push({ type: "win", atMs, stage: b.stage, reward, equipDefId });
    if (isBossStage(b.stage, p)) {
      const def = ctx2.companions.find((c) => c.chapter === chapterOf(b.stage, p));
      if (def && !g.companions[def.id]) {
        g.companions[def.id] = { level: 1 };
        g.materials[def.id] = g.materials[def.id] ?? 0;
        g.idle.mats[def.id] = g.idle.mats[def.id] ?? 0;
        if (g.stats.firstCompanionAtMs === null) g.stats.firstCompanionAtMs = atMs;
        events2.push({ type: "companion", atMs, id: def.id });
      }
    }
    if (g.highestCleared >= totalStages(p)) events2.push({ type: "allClear", atMs });
  }
  function advance(game, nowMs, dayKey, ctx2) {
    const g = clone(game);
    const events2 = [];
    if (nowMs < g.lastActiveMs) {
      events2.push({ type: "clockBack", atMs: nowMs });
      if (g.idle.anchorMs > nowMs) g.idle.anchorMs = nowMs;
      if (g.idle.windowStartMs > nowMs) g.idle.windowStartMs = nowMs;
      if (g.battle && g.battle.startedAtMs > nowMs) {
        const shift = g.battle.startedAtMs - nowMs;
        g.battle = { ...g.battle, startedAtMs: nowMs, endsAtMs: g.battle.endsAtMs - shift, resolveAtMs: g.battle.resolveAtMs - shift };
      }
    } else if (dayKey > g.daily.dayKey) {
      const first = g.daily.dayKey === -1;
      g.daily = { dayKey, counters: zeroCounters(), claims: 0, claimed: [] };
      if (!first) events2.push({ type: "dailyReset", atMs: nowMs });
    }
    if (g.battle !== null && g.battle.resolveAtMs <= nowMs) resolveBattle(g, ctx2, events2);
    g.lastActiveMs = nowMs;
    return { game: g, events: events2 };
  }
  function challenge(game, nowMs, ctx2) {
    if (game.battle !== null) return { game, ok: false, reason: "\u3044\u307E\u6226\u95D8\u4E2D\u3067\u3059" };
    const stage = nextStage(game, ctx2);
    if (stage === null) return { game, ok: false, reason: "\u3059\u3079\u3066\u306E\u9762\u3092\u7A81\u7834\u3057\u3066\u3044\u307E\u3059" };
    const allies = allySpecs(game, ctx2);
    if (allies.length === 0) return { game, ok: false, reason: "\u7DE8\u6210\u306B\u56E3\u54E1\u304C\u3044\u307E\u305B\u3093" };
    const g = clone(game);
    const enemies = enemySpecs(stage, ctx2);
    const companion = companionSpec(g, ctx2);
    const rng = createRng(g.rngState);
    const replay = runBattle(allies, enemies, ctx2.params.battle, rng, true, companion);
    g.rngState = rng.state();
    const bp = ctx2.params.battle;
    const startedAtMs = nowMs + Math.round(bp.introSec * 1e3);
    const endsAtMs = startedAtMs + Math.max(1e3, Math.round(replay.durationSec * 1e3));
    const resolveAtMs = endsAtMs + Math.round(bp.resultSec * 1e3);
    g.battle = { stage, startedAtMs, endsAtMs, resolveAtMs, win: replay.win, timedOut: replay.timedOut };
    g.stats.battles += 1;
    g.stats.actions += 1;
    g.counters.challenges += 1;
    g.daily.counters.challenges += 1;
    return { game: g, ok: true, stage, startedAtMs, endsAtMs, replay, allies, enemies, companion };
  }
  function dungeonDef(kind, ctx2) {
    return ctx2.params.dungeon.kinds.find((d) => d.id === kind);
  }
  function dungeonProgress(g, kind) {
    return g.dungeons[kind] ?? { cleared: 0, sweeps: 0, sweepDay: -1 };
  }
  function dungeonUnlocked(g, kind, ctx2) {
    const def = dungeonDef(kind, ctx2);
    return def !== void 0 && g.highestCleared >= def.unlockStage;
  }
  function dungeonCleared(g, kind) {
    return dungeonProgress(g, kind).cleared;
  }
  function sweepsLeft(g, kind, ctx2) {
    const pr = dungeonProgress(g, kind);
    const used = pr.sweepDay === g.daily.dayKey ? pr.sweeps : 0;
    return Math.max(0, ctx2.params.dungeon.sweepsPerDay - used);
  }
  function sweepsToday(g) {
    let n = 0;
    for (const pr of Object.values(g.dungeons)) if (pr.sweepDay === g.daily.dayKey) n += pr.sweeps;
    return n;
  }
  function canSweepAny(g, ctx2) {
    return ctx2.params.dungeon.kinds.some((d) => dungeonUnlocked(g, d.id, ctx2) && dungeonCleared(g, d.id) > 0 && sweepsLeft(g, d.id, ctx2) > 0);
  }
  function grantDungeon(g, reward, ctx2) {
    const got = { gold: reward.gold ?? 0, mats: 0, equips: [] };
    g.gold += got.gold;
    if ((reward.mats ?? 0) > 0 && Object.keys(g.companions).length > 0) {
      got.mats = reward.mats ?? 0;
      for (const id of Object.keys(g.companions)) g.materials[id] = (g.materials[id] ?? 0) + got.mats;
    }
    const n = reward.equips ?? 0;
    if (n > 0) {
      const rng = createRng(g.rngState);
      for (let i = 0; i < n; i++) {
        const item = rollEquip(g, reward.equipChapter ?? 1, ctx2, rng);
        if (item) got.equips.push(item.defId);
      }
      g.rngState = rng.state();
    }
    return got;
  }
  function resolveDungeon(g, kind, tier, win, timedOut, atMs, ctx2, events2) {
    const def = dungeonDef(kind, ctx2);
    const t = def?.tiers[tier - 1];
    if (!def || !t) return;
    if (!win) {
      events2.push({ type: "dungeonDefeat", atMs, kind, tier, timedOut });
      return;
    }
    g.stats.wins += 1;
    const pr = dungeonProgress(g, kind);
    if (tier !== pr.cleared + 1) return;
    g.dungeons[kind] = { ...pr, cleared: tier };
    const got = grantDungeon(g, t.first, ctx2);
    events2.push({ type: "dungeonWin", atMs, kind, tier, got });
  }
  function challengeDungeon(game, kind, nowMs, ctx2) {
    const def = dungeonDef(kind, ctx2);
    if (!def) return { game, ok: false, reason: "\u305D\u306E\u30C0\u30F3\u30B8\u30E7\u30F3\u306F\u3042\u308A\u307E\u305B\u3093" };
    if (!dungeonUnlocked(game, kind, ctx2)) return { game, ok: false, reason: `${stageLabel(def.unlockStage, ctx2.params)} \u3092\u7A81\u7834\u3059\u308B\u3068\u958B\u304D\u307E\u3059` };
    if (game.battle !== null) return { game, ok: false, reason: "\u3044\u307E\u6226\u95D8\u4E2D\u3067\u3059" };
    const tier = dungeonCleared(game, kind) + 1;
    const t = def.tiers[tier - 1];
    if (!t) return { game, ok: false, reason: "\u3059\u3079\u3066\u306E\u6BB5\u968E\u3092\u7A81\u7834\u3057\u3066\u3044\u307E\u3059" };
    const allies = allySpecs(game, ctx2);
    if (allies.length === 0) return { game, ok: false, reason: "\u7DE8\u6210\u306B\u56E3\u54E1\u304C\u3044\u307E\u305B\u3093" };
    const g = clone(game);
    const enemies = enemySpecs(t.stage, ctx2);
    const companion = companionSpec(g, ctx2);
    const rng = createRng(g.rngState);
    const replay = runBattle(allies, enemies, ctx2.params.battle, rng, true, companion);
    g.rngState = rng.state();
    const bp = ctx2.params.battle;
    const startedAtMs = nowMs + Math.round(bp.introSec * 1e3);
    const endsAtMs = startedAtMs + Math.max(1e3, Math.round(replay.durationSec * 1e3));
    const resolveAtMs = endsAtMs + Math.round(bp.resultSec * 1e3);
    g.battle = { stage: t.stage, startedAtMs, endsAtMs, resolveAtMs, win: replay.win, timedOut: replay.timedOut, dungeon: { kind, tier } };
    g.stats.battles += 1;
    g.stats.actions += 1;
    return { game: g, ok: true, stage: t.stage, startedAtMs, endsAtMs, replay, allies, enemies, companion };
  }
  function sweepDungeon(game, kind, ctx2) {
    const def = dungeonDef(kind, ctx2);
    if (!def) return { game, ok: false, reason: "\u305D\u306E\u30C0\u30F3\u30B8\u30E7\u30F3\u306F\u3042\u308A\u307E\u305B\u3093" };
    if (!dungeonUnlocked(game, kind, ctx2)) return { game, ok: false, reason: `${stageLabel(def.unlockStage, ctx2.params)} \u3092\u7A81\u7834\u3059\u308B\u3068\u958B\u304D\u307E\u3059` };
    const tier = dungeonCleared(game, kind);
    const t = def.tiers[tier - 1];
    if (tier === 0 || !t) return { game, ok: false, reason: "\u307E\u3060\u3001\u7A81\u7834\u3057\u305F\u6BB5\u968E\u304C\u3042\u308A\u307E\u305B\u3093" };
    if (sweepsLeft(game, kind, ctx2) <= 0) return { game, ok: false, reason: "\u4ECA\u65E5\u306E\u6E05\u6383\u306F\u3001\u3082\u3046\u4F7F\u3044\u5207\u308A\u307E\u3057\u305F" };
    const g = clone(game);
    const pr = dungeonProgress(g, kind);
    const used = pr.sweepDay === g.daily.dayKey ? pr.sweeps : 0;
    g.dungeons[kind] = { ...pr, sweeps: used + 1, sweepDay: g.daily.dayKey };
    const got = grantDungeon(g, t.sweep, ctx2);
    g.stats.actions += 1;
    return { game: g, ok: true, tier, got };
  }
  function levelPlan(g, id, target, ctx2) {
    const own = g.members[id];
    const def = ctx2.byId[id];
    if (!own || !def) return { ok: false, from: 0, target, cost: 0, reason: "\u305D\u306E\u56E3\u54E1\u306F\u3044\u307E\u305B\u3093" };
    const cap = levelCap(def, own.plus, ctx2.params);
    if (!Number.isInteger(target) || target <= own.level) {
      const atCap = own.level >= cap;
      return { ok: false, from: own.level, target, cost: 0, reason: atCap ? "\u30EC\u30D9\u30EB\u306E\u4E0A\u9650\u3067\u3059\uFF08\u6607\u683C\u3067\u4F38\u3073\u307E\u3059\uFF09" : "\u3044\u307E\u3088\u308A\u4E0A\u306E\u30EC\u30D9\u30EB\u3092\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044" };
    }
    const cost = levelCostTo(own.level, target, ctx2.params);
    if (target > cap) return { ok: false, from: own.level, target, cost, reason: `\u30EC\u30D9\u30EB\u306E\u4E0A\u9650\u306F ${cap} \u3067\u3059\uFF08\u6607\u683C\u3067\u4F38\u3073\u307E\u3059\uFF09` };
    if (g.gold < cost) return { ok: false, from: own.level, target, cost, reason: "\u304A\u3072\u306D\u308A\u304C\u8DB3\u308A\u307E\u305B\u3093" };
    return { ok: true, from: own.level, target, cost };
  }
  function maxAffordableLevel(g, id, ctx2) {
    const own = g.members[id];
    const def = ctx2.byId[id];
    if (!own || !def) return 0;
    const cap = levelCap(def, own.plus, ctx2.params);
    let level = own.level;
    let left = g.gold;
    while (level < cap) {
      const cost = levelCostTo(level, level + 1, ctx2.params);
      if (cost > left) break;
      left -= cost;
      level += 1;
    }
    return level;
  }
  function levelUpTo(game, id, target, ctx2) {
    const plan = levelPlan(game, id, target, ctx2);
    if (!plan.ok) return { game, ok: false, reason: plan.reason };
    const g = clone(game);
    const levels = plan.target - plan.from;
    g.gold -= plan.cost;
    g.members[id].level = plan.target;
    g.counters.levelUps += levels;
    g.daily.counters.levelUps += levels;
    g.stats.actions += 1;
    return { game: g, ok: true, levels };
  }
  function resetInfo(g, id, ctx2) {
    const own = g.members[id];
    if (!own) return { ok: false, refund: 0, reason: "\u305D\u306E\u56E3\u54E1\u306F\u3044\u307E\u305B\u3093" };
    if (own.level <= 1) return { ok: false, refund: 0, reason: "\u30EC\u30D9\u30EB1\u306A\u306E\u3067\u3001\u30EA\u30BB\u30C3\u30C8\u3059\u308B\u3082\u306E\u304C\u3042\u308A\u307E\u305B\u3093" };
    return { ok: true, refund: levelCostTo(1, own.level, ctx2.params) };
  }
  function resetLevel(game, id, ctx2) {
    const info = resetInfo(game, id, ctx2);
    if (!info.ok) return { game, ok: false, reason: info.reason };
    const g = clone(game);
    g.members[id].level = 1;
    g.gold += info.refund;
    g.counters.resets += 1;
    g.stats.actions += 1;
    return { game: g, ok: true, refund: info.refund };
  }
  function promoteInfo(g, id, ctx2) {
    const own = g.members[id];
    if (!own) return { ok: false, need: 0, reason: "\u305D\u306E\u56E3\u54E1\u306F\u3044\u307E\u305B\u3093" };
    if (own.plus >= maxPlus(ctx2.params)) return { ok: false, need: 0, reason: "\u3053\u308C\u4EE5\u4E0A\u306F\u6607\u683C\u3067\u304D\u307E\u305B\u3093" };
    const need2 = ctx2.params.member.shardsToPromote[own.plus];
    if (own.shards < need2) return { ok: false, need: need2, reason: "\u304B\u3051\u3089\u304C\u8DB3\u308A\u307E\u305B\u3093" };
    return { ok: true, need: need2 };
  }
  function promote(game, id, ctx2) {
    const info = promoteInfo(game, id, ctx2);
    if (!info.ok) return { game, ok: false, reason: info.reason };
    const g = clone(game);
    const own = g.members[id];
    own.shards -= info.need;
    own.plus += 1;
    g.counters.promotes += 1;
    g.stats.actions += 1;
    return { game: g, ok: true };
  }
  function bannerRarities(banner, ctx2, minStars) {
    const usable = Object.keys(banner.weights).filter((r) => (banner.weights[r] ?? 0) > 0 && ctx2.members.some((m) => m.rarity === r));
    const filtered = usable.filter((r) => (ctx2.params.recruit.rarities[r]?.stars ?? 0) >= minStars);
    return filtered.length > 0 ? filtered : usable;
  }
  function recruitRates(ctx2, bannerId) {
    const banner = ctx2.params.recruit.banners[bannerId];
    const used = bannerRarities(banner, ctx2, 0);
    const totalRarity = used.reduce((a, r) => a + (banner.weights[r] ?? 0), 0);
    const out = [];
    for (const r of used) {
      const group = ctx2.members.filter((m) => m.rarity === r);
      const totalWeight = group.reduce((a, m) => a + (m.weight ?? 1), 0);
      for (const m of group) {
        out.push({ id: m.id, rate: (banner.weights[r] ?? 0) / totalRarity * ((m.weight ?? 1) / totalWeight) });
      }
    }
    return out;
  }
  function recruitRarityRates(ctx2, bannerId) {
    const banner = ctx2.params.recruit.banners[bannerId];
    const used = bannerRarities(banner, ctx2, 0);
    const total = used.reduce((a, r) => a + (banner.weights[r] ?? 0), 0);
    return used.map((r) => ({ rarity: r, rate: (banner.weights[r] ?? 0) / total }));
  }
  function pityLeft(g, bannerId, ctx2) {
    const banner = ctx2.params.recruit.banners[bannerId];
    if (banner.pity <= 0) return null;
    return Math.max(1, banner.pity - (g.recruit.pity[bannerId] ?? 0));
  }
  function ticketsOf(g, bannerId) {
    return bannerId === "premium" ? g.premiumTickets : g.tickets;
  }
  function recruit(game, bannerId, count, ctx2) {
    const banner = ctx2.params.recruit.banners[bannerId];
    if (!banner) return { game, ok: false, reason: "\u305D\u306E\u52E7\u8A98\u306F\u3042\u308A\u307E\u305B\u3093" };
    if (count !== 1 && count !== 10) return { game, ok: false, reason: "\u52E7\u8A98\u306F\u30011\u56DE\u304B10\u9023\u3067\u3059" };
    if (ticketsOf(game, bannerId) < count) return { game, ok: false, reason: bannerId === "premium" ? "\u9AD8\u7D1A\u30C1\u30B1\u30C3\u30C8\u304C\u8DB3\u308A\u307E\u305B\u3093" : "\u901A\u5E38\u30C1\u30B1\u30C3\u30C8\u304C\u8DB3\u308A\u307E\u305B\u3093" };
    const g = clone(game);
    if (bannerId === "premium") g.premiumTickets -= count;
    else g.tickets -= count;
    let forced = [];
    if (bannerId === "premium" && count === 10 && !g.recruit.firstTenDone) {
      forced = ctx2.params.recruit.firstPremiumTen.slice(0, count);
      g.recruit.firstTenDone = true;
    }
    const rarities = ctx2.params.recruit.rarities;
    const rng = createRng(g.rngState);
    const results = [];
    let guaranteed = banner.tenGuaranteeStars <= 0;
    for (let i = 0; i < count; i++) {
      let def;
      const forcedId = forced[i];
      if (forcedId !== void 0) {
        def = ctx2.byId[forcedId];
      } else {
        let minStars = 0;
        if (banner.pity > 0 && (g.recruit.pity[bannerId] ?? 0) + 1 >= banner.pity) minStars = banner.pityStars;
        if (count === 10 && !guaranteed && i === count - 1) minStars = Math.max(minStars, banner.tenGuaranteeStars);
        const pool = bannerRarities(banner, ctx2, minStars);
        const rarity = pick(pool, (r) => banner.weights[r] ?? 0, rng.next());
        def = pick(
          ctx2.members.filter((m) => m.rarity === rarity),
          (m) => m.weight ?? 1,
          rng.next()
        );
      }
      const stars = rarities[def.rarity]?.stars ?? 0;
      if (stars >= banner.tenGuaranteeStars) guaranteed = true;
      if (banner.pity > 0) g.recruit.pity[bannerId] = stars >= banner.pityStars ? 0 : (g.recruit.pity[bannerId] ?? 0) + 1;
      const own = g.members[def.id];
      if (own) {
        own.shards += 1;
        results.push({ id: def.id, duplicate: true });
      } else {
        g.members[def.id] = { level: 1, plus: 0, shards: 0 };
        results.push({ id: def.id, duplicate: false });
      }
    }
    g.rngState = rng.state();
    g.counters.recruits += count;
    g.daily.counters.recruits += count;
    g.stats.actions += 1;
    return { game: g, ok: true, results };
  }
  function setPartySlot(game, slot, id) {
    if (!Number.isInteger(slot) || slot < 0 || slot >= PARTY_SIZE) return { game, ok: false, reason: "\u305D\u306E\u67A0\u306F\u3042\u308A\u307E\u305B\u3093" };
    if (id !== null && !game.members[id]) return { game, ok: false, reason: "\u305D\u306E\u56E3\u54E1\u306F\u3044\u307E\u305B\u3093" };
    const g = clone(game);
    const before = g.party[slot] ?? null;
    if (id !== null) {
      const other = g.party.indexOf(id);
      if (other >= 0 && other !== slot) g.party[other] = before;
    }
    g.party[slot] = id;
    if (g.party.every((x) => x === null)) return { game, ok: false, reason: "\u7DE8\u6210\u3092\u7A7A\u306B\u306F\u3067\u304D\u307E\u305B\u3093" };
    if (g.stats.partyFullAtMs === null && g.party.every((x) => x !== null)) g.stats.partyFullAtMs = g.lastActiveMs;
    g.stats.actions += 1;
    return { game: g, ok: true };
  }
  function setCompanion(game, id) {
    if (id !== null && !game.companions[id]) return { game, ok: false, reason: "\u305D\u306E\u76F8\u68D2\u306F\u3044\u307E\u305B\u3093" };
    if (game.companionSlot === id) return { game, ok: false, reason: id === null ? "\u76F8\u68D2\u306F\u5165\u3063\u3066\u3044\u307E\u305B\u3093" : "\u3059\u3067\u306B\u7DE8\u6210\u306B\u5165\u3063\u3066\u3044\u307E\u3059" };
    const g = clone(game);
    g.companionSlot = id;
    g.stats.actions += 1;
    return { game: g, ok: true };
  }
  function companionLevelInfo(g, id, ctx2) {
    const own = g.companions[id];
    if (!own) return { ok: false, gold: 0, mats: 0, reason: "\u305D\u306E\u76F8\u68D2\u306F\u3044\u307E\u305B\u3093" };
    const p = ctx2.params;
    const gold = Math.round(companionCostMinutes(own.level, p) * idleGoldPerMin(Math.max(1, g.highestCleared), p));
    const mats = companionMatCost(own.level, p);
    if (own.level >= p.companion.levelCap) return { ok: false, gold, mats, reason: "\u30EC\u30D9\u30EB\u306E\u4E0A\u9650\u3067\u3059" };
    if ((g.materials[id] ?? 0) < mats) return { ok: false, gold, mats, reason: "\u5C02\u7528\u306E\u7D20\u6750\u304C\u8DB3\u308A\u307E\u305B\u3093" };
    if (g.gold < gold) return { ok: false, gold, mats, reason: "\u304A\u3072\u306D\u308A\u304C\u8DB3\u308A\u307E\u305B\u3093" };
    return { ok: true, gold, mats };
  }
  function companionLevelUp(game, id, ctx2) {
    const info = companionLevelInfo(game, id, ctx2);
    if (!info.ok) return { game, ok: false, reason: info.reason };
    const g = clone(game);
    g.gold -= info.gold;
    g.materials[id] = (g.materials[id] ?? 0) - info.mats;
    g.companions[id].level += 1;
    g.counters.companionLevelUps += 1;
    g.daily.counters.companionLevelUps += 1;
    g.stats.actions += 1;
    return { game: g, ok: true };
  }
  function findEquip(g, uid) {
    return g.equips.find((e) => e.uid === uid);
  }
  function equipItem(game, uid, memberId, ctx2) {
    const item = findEquip(game, uid);
    const def = item ? ctx2.equipById[item.defId] : void 0;
    if (!item || !def) return { game, ok: false, reason: "\u305D\u306E\u88C5\u5099\u306F\u3042\u308A\u307E\u305B\u3093" };
    if (!game.members[memberId]) return { game, ok: false, reason: "\u305D\u306E\u56E3\u54E1\u306F\u3044\u307E\u305B\u3093" };
    if (item.on === memberId) return { game, ok: false, reason: "\u3059\u3067\u306B\u4ED8\u3051\u3066\u3044\u307E\u3059" };
    const g = clone(game);
    for (const e of g.equips) {
      if (e.on === memberId && ctx2.equipById[e.defId]?.slot === def.slot) e.on = null;
    }
    findEquip(g, uid).on = memberId;
    g.stats.actions += 1;
    return { game: g, ok: true };
  }
  function unequipItem(game, uid) {
    const item = findEquip(game, uid);
    if (!item) return { game, ok: false, reason: "\u305D\u306E\u88C5\u5099\u306F\u3042\u308A\u307E\u305B\u3093" };
    if (item.on === null) return { game, ok: false, reason: "\u4ED8\u3051\u3066\u3044\u307E\u305B\u3093" };
    const g = clone(game);
    findEquip(g, uid).on = null;
    g.stats.actions += 1;
    return { game: g, ok: true };
  }
  function unequipAll(game, memberId) {
    if (!game.members[memberId]) return { game, ok: false, reason: "\u305D\u306E\u56E3\u54E1\u306F\u3044\u307E\u305B\u3093" };
    const removed = game.equips.filter((e) => e.on === memberId).length;
    if (removed === 0) return { game, ok: false, reason: "\u88C5\u5099\u3092\u4ED8\u3051\u3066\u3044\u307E\u305B\u3093" };
    const g = clone(game);
    for (const e of g.equips) if (e.on === memberId) e.on = null;
    g.stats.actions += 1;
    return { game: g, ok: true, removed };
  }
  function enhanceInfo(g, uid, ctx2) {
    const item = findEquip(g, uid);
    const def = item ? ctx2.equipById[item.defId] : void 0;
    if (!item || !def) return { ok: false, gold: 0, reason: "\u305D\u306E\u88C5\u5099\u306F\u3042\u308A\u307E\u305B\u3093" };
    const p = ctx2.params;
    const gold = Math.round(equipEnhanceMinutes(def, item.level, p) * idleGoldPerMin(Math.max(1, g.highestCleared), p));
    if (item.level >= equipLevelCap(def, p)) return { ok: false, gold, reason: "\u5F37\u5316\u306E\u4E0A\u9650\u3067\u3059" };
    if (g.gold < gold) return { ok: false, gold, reason: "\u304A\u3072\u306D\u308A\u304C\u8DB3\u308A\u307E\u305B\u3093" };
    return { ok: true, gold };
  }
  function enhanceEquip(game, uid, ctx2) {
    const info = enhanceInfo(game, uid, ctx2);
    if (!info.ok) return { game, ok: false, reason: info.reason };
    const g = clone(game);
    g.gold -= info.gold;
    findEquip(g, uid).level += 1;
    g.counters.enhances += 1;
    g.daily.counters.enhances += 1;
    g.stats.actions += 1;
    return { game: g, ok: true };
  }
  function autoEquipInto(g, memberId, ctx2, usable) {
    let changed = 0;
    for (const slot of EQUIP_SLOTS) {
      let best = null;
      let bestBonus = -1;
      for (const e of g.equips) {
        const def = ctx2.equipById[e.defId];
        if (!def || def.slot !== slot) continue;
        if (e.on !== memberId && !usable(e)) continue;
        const bonus = equipBonus(def, e.level, ctx2.params);
        const better = bonus > bestBonus + 1e-12 || Math.abs(bonus - bestBonus) <= 1e-12 && best !== null && best.on !== memberId && e.on === memberId;
        if (better) {
          best = e;
          bestBonus = bonus;
        }
      }
      if (best === null || best.on === memberId) continue;
      for (const e of g.equips) {
        if (e.on === memberId && ctx2.equipById[e.defId]?.slot === slot) e.on = null;
      }
      best.on = memberId;
      changed += 1;
    }
    return changed;
  }
  function autoEquip(game, memberId, ctx2) {
    if (!game.members[memberId]) return { game, ok: false, reason: "\u305D\u306E\u56E3\u54E1\u306F\u3044\u307E\u305B\u3093" };
    const g = clone(game);
    const changed = autoEquipInto(g, memberId, ctx2, (e) => e.on === null);
    if (changed === 0) return { game, ok: false, reason: "\u3044\u307E\u3088\u308A\u826F\u3044\u88C5\u5099\u304C\u3001\u624B\u6301\u3061\u306B\u3042\u308A\u307E\u305B\u3093" };
    g.stats.actions += 1;
    return { game: g, ok: true, changed };
  }
  function autoEquipParty(game, ctx2) {
    const g = clone(game);
    let changed = 0;
    for (const id of g.party) {
      if (id === null) continue;
      changed += autoEquipInto(g, id, ctx2, (e) => e.on === null || !g.party.includes(e.on));
    }
    if (changed === 0) return { game, ok: false, reason: "\u3044\u307E\u3088\u308A\u826F\u3044\u88C5\u5099\u304C\u3001\u624B\u6301\u3061\u306B\u3042\u308A\u307E\u305B\u3093" };
    g.stats.actions += 1;
    return { game: g, ok: true, changed };
  }
  function canAutoEquip(g, memberId, ctx2) {
    if (!g.members[memberId]) return false;
    for (const slot of EQUIP_SLOTS) {
      let mine = -1;
      let bestFree = -1;
      for (const e of g.equips) {
        const def = ctx2.equipById[e.defId];
        if (!def || def.slot !== slot) continue;
        const bonus = equipBonus(def, e.level, ctx2.params);
        if (e.on === memberId) mine = bonus;
        else if (e.on === null && bonus > bestFree) bestFree = bonus;
      }
      if (bestFree > mine + 1e-12) return true;
    }
    return false;
  }
  function canAutoEquipParty(g, ctx2) {
    return autoEquipParty(g, ctx2).ok;
  }
  function missionProgress(kind, g) {
    switch (kind) {
      case "clear":
        return g.highestCleared;
      case "memberLevel": {
        let max = 0;
        for (const m of Object.values(g.members)) if (m.level > max) max = m.level;
        return max;
      }
      case "partyLevel": {
        let sum = 0;
        for (const id of g.party) if (id !== null) sum += g.members[id]?.level ?? 0;
        return sum;
      }
      case "recruits":
        return g.counters.recruits;
      case "partySize":
        return g.party.filter((x) => x !== null).length;
      case "promotes":
        return g.counters.promotes;
      case "resets":
        return g.counters.resets;
      case "idleClaims":
        return g.counters.idleClaims;
      case "companions":
        return Object.keys(g.companions).length;
      case "companionEquipped":
        return g.companionSlot !== null ? 1 : 0;
      case "companionLevelUps":
        return g.counters.companionLevelUps;
      case "equipped":
        return equippedCount(g);
      case "enhances":
        return g.counters.enhances;
      case "dungeonTier": {
        let max = 0;
        for (const pr of Object.values(g.dungeons)) if (pr.cleared > max) max = pr.cleared;
        return max;
      }
    }
  }
  function dailyProgress(kind, g) {
    if (kind === "dailyClaims") return g.daily.claims;
    if (kind === "sweeps") return sweepsToday(g);
    return g.daily.counters[kind];
  }
  function missionList(g, ctx2) {
    return ctx2.missions.map((def) => {
      const progress = Math.min(def.target, missionProgress(def.kind, g));
      const claimed = g.missionsClaimed.includes(def.id);
      return { def, progress, claimable: !claimed && progress >= def.target, claimed, reward: rewardAmounts(g, def.reward, ctx2) };
    });
  }
  function dailyList(g, ctx2) {
    return ctx2.dailies.map((def) => {
      const progress = Math.min(def.target, dailyProgress(def.kind, g));
      const claimed = g.daily.claimed.includes(def.id);
      return { def, progress, claimable: !claimed && progress >= def.target, claimed, reward: rewardAmounts(g, def.reward, ctx2) };
    });
  }
  function claimMission(game, id, ctx2) {
    const view = missionList(game, ctx2).find((m) => m.def.id === id);
    if (!view) return { game, ok: false, reason: "\u305D\u306E\u30DF\u30C3\u30B7\u30E7\u30F3\u306F\u3042\u308A\u307E\u305B\u3093" };
    if (view.claimed) return { game, ok: false, reason: "\u3059\u3067\u306B\u53D7\u3051\u53D6\u3063\u3066\u3044\u307E\u3059" };
    if (!view.claimable) return { game, ok: false, reason: "\u307E\u3060\u9054\u6210\u3057\u3066\u3044\u307E\u305B\u3093" };
    const g = clone(game);
    grant(g, view.reward);
    g.missionsClaimed.push(id);
    g.stats.actions += 1;
    return { game: g, ok: true, reward: view.reward };
  }
  function claimDaily(game, id, ctx2) {
    const view = dailyList(game, ctx2).find((m) => m.def.id === id);
    if (!view) return { game, ok: false, reason: "\u305D\u306E\u65E5\u8AB2\u306F\u3042\u308A\u307E\u305B\u3093" };
    if (view.claimed) return { game, ok: false, reason: "\u3059\u3067\u306B\u53D7\u3051\u53D6\u3063\u3066\u3044\u307E\u3059" };
    if (!view.claimable) return { game, ok: false, reason: "\u307E\u3060\u9054\u6210\u3057\u3066\u3044\u307E\u305B\u3093" };
    const g = clone(game);
    grant(g, view.reward);
    g.daily.claimed.push(id);
    if (view.def.kind !== "dailyClaims") g.daily.claims += 1;
    g.stats.actions += 1;
    return { game: g, ok: true, reward: view.reward };
  }
  function isNum(v) {
    return typeof v === "number" && Number.isFinite(v);
  }
  function isRecord(v) {
    return typeof v === "object" && v !== null && !Array.isArray(v);
  }
  function isCounters(v) {
    if (!isRecord(v)) return false;
    return COUNTER_KEYS.every((k) => isNum(v[k]) && v[k] >= 0);
  }
  function isNumberMap(v) {
    return isRecord(v) && Object.values(v).every((x) => isNum(x));
  }
  function isStringList(v) {
    return Array.isArray(v) && v.every((x) => typeof x === "string");
  }
  function isGameData(v) {
    if (!isRecord(v)) return false;
    if (v["v"] !== GAME_VERSION) return false;
    for (const k of ["startedAtMs", "lastActiveMs", "gold", "tickets", "premiumTickets", "highestCleared", "rngState", "nextEquipUid"]) {
      if (!isNum(v[k])) return false;
    }
    if (v["gold"] < 0 || v["tickets"] < 0 || v["premiumTickets"] < 0 || v["highestCleared"] < 0) return false;
    const members = v["members"];
    if (!isRecord(members) || Object.keys(members).length === 0) return false;
    for (const m of Object.values(members)) {
      if (!isRecord(m) || !isNum(m["level"]) || !isNum(m["plus"]) || !isNum(m["shards"])) return false;
      if (m["level"] < 1 || m["plus"] < 0 || m["shards"] < 0) return false;
    }
    const party = v["party"];
    if (!Array.isArray(party) || party.length !== PARTY_SIZE) return false;
    if (!party.every((x) => x === null || typeof x === "string" && x in members)) return false;
    if (party.every((x) => x === null)) return false;
    const companions = v["companions"];
    if (!isRecord(companions)) return false;
    for (const c of Object.values(companions)) {
      if (!isRecord(c) || !isNum(c["level"]) || c["level"] < 1) return false;
    }
    const slot = v["companionSlot"];
    if (slot !== null && !(typeof slot === "string" && slot in companions)) return false;
    if (!isNumberMap(v["materials"])) return false;
    const equips = v["equips"];
    if (!Array.isArray(equips)) return false;
    const uids = /* @__PURE__ */ new Set();
    for (const e of equips) {
      if (!isRecord(e) || !isNum(e["uid"]) || typeof e["defId"] !== "string" || !isNum(e["level"]) || e["level"] < 0) return false;
      if (e["on"] !== null && !(typeof e["on"] === "string" && e["on"] in members)) return false;
      if (uids.has(e["uid"]) || e["uid"] >= v["nextEquipUid"]) return false;
      uids.add(e["uid"]);
    }
    const b = v["battle"];
    if (b !== null) {
      if (!isRecord(b) || !isNum(b["stage"]) || !isNum(b["startedAtMs"]) || !isNum(b["endsAtMs"]) || !isNum(b["resolveAtMs"])) return false;
      if (typeof b["win"] !== "boolean" || typeof b["timedOut"] !== "boolean") return false;
    }
    const idle = v["idle"];
    if (!isRecord(idle) || !isNum(idle["windowStartMs"]) || !isNum(idle["anchorMs"]) || !isNum(idle["gold"]) || !isNumberMap(idle["mats"]) || !isNum(idle["equip"])) return false;
    if (!isCounters(v["counters"]) || !isStringList(v["missionsClaimed"])) return false;
    const rec = v["recruit"];
    if (!isRecord(rec) || !isNumberMap(rec["pity"]) || typeof rec["firstTenDone"] !== "boolean") return false;
    const daily = v["daily"];
    if (!isRecord(daily) || !isNum(daily["dayKey"]) || !isNum(daily["claims"]) || !isCounters(daily["counters"]) || !isStringList(daily["claimed"])) return false;
    const dg = v["dungeons"];
    if (dg !== void 0) {
      if (!isRecord(dg)) return false;
      for (const d of Object.values(dg)) {
        if (!isRecord(d) || !isNum(d["cleared"]) || !isNum(d["sweeps"]) || !isNum(d["sweepDay"]) || d["cleared"] < 0 || d["sweeps"] < 0) return false;
      }
    }
    const s = v["stats"];
    if (!isRecord(s)) return false;
    for (const k of ["battles", "wins", "defeats", "actions", "lastProgressAtMs", "longestStallMs"]) {
      if (!isNum(s[k])) return false;
    }
    for (const k of ["firstDefeatAtMs", "firstCompanionAtMs", "partyFullAtMs"]) {
      if (s[k] !== null && !isNum(s[k])) return false;
    }
    return true;
  }
  function sanitizeGame(game, ctx2) {
    const g = clone(game);
    for (const id of Object.keys(g.members)) {
      if (!ctx2.byId[id]) delete g.members[id];
    }
    g.party = g.party.map((id) => id !== null && g.members[id] ? id : null);
    if (Object.keys(g.members).length === 0) {
      for (const m of ctx2.members.filter((d) => d.starter)) g.members[m.id] = { level: 1, plus: 0, shards: 0 };
    }
    if (g.party.every((x) => x === null)) {
      Object.keys(g.members).slice(0, PARTY_SIZE).forEach((id, i) => {
        g.party[i] = id;
      });
    }
    for (const id of Object.keys(g.companions)) {
      if (!ctx2.companionById[id]) {
        delete g.companions[id];
        delete g.materials[id];
        delete g.idle.mats[id];
      }
    }
    if (g.companionSlot !== null && !g.companions[g.companionSlot]) g.companionSlot = null;
    g.equips = g.equips.filter((e) => ctx2.equipById[e.defId] !== void 0);
    for (const e of g.equips) {
      if (e.on !== null && !g.members[e.on]) e.on = null;
    }
    g.highestCleared = Math.min(g.highestCleared, totalStages(ctx2.params));
    const dungeons = {};
    for (const d of ctx2.params.dungeon.kinds) {
      const pr = g.dungeons[d.id];
      if (pr) dungeons[d.id] = { cleared: Math.min(Math.max(0, Math.floor(pr.cleared)), d.tiers.length), sweeps: Math.max(0, Math.floor(pr.sweeps)), sweepDay: pr.sweepDay };
    }
    g.dungeons = dungeons;
    if (g.battle !== null) {
      const bd = g.battle.dungeon;
      const ok = bd ? dungeonDef(bd.kind, ctx2)?.tiers[bd.tier - 1] !== void 0 && bd.tier === dungeonCleared(g, bd.kind) + 1 : g.battle.stage === g.highestCleared + 1;
      if (!ok) g.battle = null;
    }
    return g;
  }

  // src/core/state.ts
  var STATE_VERSION = 1;
  function createInitialState(nowMs, seed) {
    return {
      version: STATE_VERSION,
      createdAtMs: nowMs,
      lastSeenAtMs: nowMs,
      opens: 0,
      taps: 0,
      rngState: seed >>> 0
    };
  }
  function onOpen(state, nowMs) {
    const clockWentBack = nowMs < state.lastSeenAtMs;
    const awayMs = clockWentBack ? 0 : nowMs - state.lastSeenAtMs;
    return {
      state: { ...state, opens: state.opens + 1, lastSeenAtMs: nowMs },
      awayMs,
      clockWentBack
    };
  }
  function onTap(state, nowMs) {
    return {
      ...state,
      taps: state.taps + 1,
      lastSeenAtMs: Math.max(state.lastSeenAtMs, nowMs)
    };
  }

  // src/core/save.ts
  var SAVE_FORMAT = "idle-game-save";
  var MIGRATIONS = {};
  function serialize(state, nowMs) {
    const envelope = {
      format: SAVE_FORMAT,
      version: state.version,
      savedAtMs: nowMs,
      state
    };
    return JSON.stringify(envelope);
  }
  function deserialize(text, migrations = MIGRATIONS, currentVersion = STATE_VERSION) {
    if (text === null || text === void 0 || text === "") return { kind: "empty" };
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { kind: "corrupt", reason: "JSON\u3068\u3057\u3066\u8AAD\u3081\u307E\u305B\u3093" };
    }
    if (!isRecord2(parsed) || parsed["format"] !== SAVE_FORMAT) {
      return { kind: "corrupt", reason: "\u3053\u306E\u30B2\u30FC\u30E0\u306E\u30BB\u30FC\u30D6\u3067\u306F\u3042\u308A\u307E\u305B\u3093" };
    }
    const version2 = parsed["version"];
    if (typeof version2 !== "number" || !Number.isInteger(version2) || version2 < 1) {
      return { kind: "corrupt", reason: "\u7248\u756A\u53F7\u304C\u3042\u308A\u307E\u305B\u3093" };
    }
    if (version2 > currentVersion) return { kind: "too_new", version: version2 };
    let state = parsed["state"];
    if (!isRecord2(state)) return { kind: "corrupt", reason: "\u72B6\u614B\u304C\u5165\u3063\u3066\u3044\u307E\u305B\u3093" };
    for (let v = version2; v < currentVersion; v++) {
      const step = migrations[v];
      if (!step) return { kind: "corrupt", reason: `\u7248${v}\u304B\u3089\u7248${v + 1}\u3078\u306E\u5909\u63DB\u304C\u3042\u308A\u307E\u305B\u3093` };
      state = { ...step(state), version: v + 1 };
    }
    let gameReset = false;
    const game = state["game"];
    if (game !== void 0) {
      const gv = isRecord2(game) ? game["v"] : void 0;
      if (typeof gv === "number" && gv > GAME_VERSION) return { kind: "too_new", version: gv };
      if (typeof gv === "number" && Number.isInteger(gv) && gv >= 1 && gv < GAME_VERSION) {
        const rest = { ...state };
        delete rest["game"];
        state = rest;
        gameReset = true;
      } else if (!isGameData(game)) {
        return { kind: "corrupt", reason: "\u30B2\u30FC\u30E0\u306E\u72B6\u614B\u306E\u5F62\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093" };
      }
    }
    if (!isGameState(state, currentVersion)) {
      return { kind: "corrupt", reason: "\u72B6\u614B\u306E\u5F62\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093" };
    }
    return { kind: "ok", state, migratedFrom: version2 === currentVersion ? null : version2, gameReset };
  }
  function isRecord2(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
  }
  function isGameState(value, currentVersion) {
    if (!isRecord2(value)) return false;
    return value["version"] === currentVersion && isFiniteNumber(value["createdAtMs"]) && isFiniteNumber(value["lastSeenAtMs"]) && isFiniteNumber(value["opens"]) && value["opens"] >= 0 && isFiniteNumber(value["taps"]) && value["taps"] >= 0 && isFiniteNumber(value["rngState"]);
  }

  // src/ui/session.ts
  var MAX_MARKS = 600;
  var CHECKPOINT_MINUTES = [10, 20, 30, 45, 60];
  var ACTIVE_GAP_MS = 5e3;
  function newPlayLog(nowMs) {
    return { v: 1, startedAtMs: nowMs, activeMs: 0, opens: 0, debugUsed: false, counts: {}, marks: [], checkpoints: [] };
  }
  function parsePlayLog(text, nowMs) {
    if (text === null || text === "") return newPlayLog(nowMs);
    try {
      const v = JSON.parse(text);
      if (v.v === 1 && typeof v.activeMs === "number" && Array.isArray(v.marks) && typeof v.counts === "object" && v.counts !== null) {
        return {
          v: 1,
          startedAtMs: typeof v.startedAtMs === "number" ? v.startedAtMs : nowMs,
          activeMs: v.activeMs,
          opens: typeof v.opens === "number" ? v.opens : 0,
          debugUsed: v.debugUsed === true,
          counts: v.counts,
          marks: v.marks,
          checkpoints: Array.isArray(v.checkpoints) ? v.checkpoints : []
        };
      }
    } catch {
    }
    return newPlayLog(nowMs);
  }
  function formatAway(ms) {
    const min = Math.floor(ms / 6e4);
    if (min < 1) return `${Math.floor(ms / 1e3)}\u79D2`;
    if (min < 60) return `${min}\u5206`;
    return `${Math.floor(min / 60)}\u6642\u9593${min % 60}\u5206`;
  }
  function partyLevels(game) {
    let sum = 0;
    for (const id of game.party) if (id !== null) sum += game.members[id]?.level ?? 0;
    return sum;
  }
  function createSession(deps, content) {
    const notices = [];
    let canSave = true;
    let firstRun = false;
    let saveText = "";
    let lastSaveOk = true;
    let offsetMs = 0;
    let speed = 1;
    if (deps.debug) {
      try {
        const d = JSON.parse(deps.read("debug").text ?? "{}");
        if (typeof d.offsetMs === "number" && Number.isFinite(d.offsetMs) && d.offsetMs > 0) offsetMs = d.offsetMs;
      } catch {
        offsetMs = 0;
      }
    }
    let lastReal = deps.now();
    const now = () => deps.now() + offsetMs;
    const startMs = now();
    const read = deps.read("save");
    if (read.error) notices.push(`\u4FDD\u5B58\u9818\u57DF\u3092\u8AAD\u3081\u307E\u305B\u3093\u3067\u3057\u305F\uFF08${read.error}\uFF09\u3002`);
    const loaded = deserialize(read.text);
    let state;
    let gameReset = false;
    if (loaded.kind === "ok") {
      state = loaded.state;
      saveText = read.text ?? "";
      if (loaded.migratedFrom !== null) notices.push(`\u30BB\u30FC\u30D6\u3092\u7248${loaded.migratedFrom}\u304B\u3089\u66F4\u65B0\u3057\u307E\u3057\u305F\u3002`);
      if (loaded.gameReset) {
        gameReset = true;
        if (read.text) deps.backup(read.text, startMs);
        notices.push("\u30B2\u30FC\u30E0\u306E\u4F5C\u308A\u304C\u5927\u304D\u304F\u5909\u308F\u3063\u305F\u306E\u3067\u3001\u6700\u521D\u304B\u3089\u306B\u306A\u308A\u307E\u3057\u305F\u3002\u524D\u306E\u30BB\u30FC\u30D6\u306F\u9000\u907F\u3057\u3066\u3042\u308A\u307E\u3059\u3002");
      }
    } else if (loaded.kind === "too_new") {
      canSave = false;
      state = createInitialState(startMs, deps.seed());
      notices.push(`\u3053\u306E\u30BB\u30FC\u30D6\u306F\u65B0\u3057\u3044\u7248\uFF08\u7248${loaded.version}\uFF09\u306E\u3082\u306E\u3067\u3059\u3002\u4E0A\u66F8\u304D\u3092\u907F\u3051\u308B\u305F\u3081\u3001\u4ECA\u56DE\u306F\u4FDD\u5B58\u3057\u307E\u305B\u3093\u3002`);
    } else {
      if (loaded.kind === "corrupt" && read.text) {
        deps.backup(read.text, startMs);
        notices.push(`\u30BB\u30FC\u30D6\u3092\u8AAD\u3081\u306A\u304B\u3063\u305F\u306E\u3067\u3001\u9000\u907F\u3057\u3066\u6700\u521D\u304B\u3089\u59CB\u3081\u307E\u3059\uFF08${loaded.reason}\uFF09\u3002`);
      }
      state = createInitialState(startMs, deps.seed());
      firstRun = loaded.kind === "empty";
    }
    let game = state.game ? sanitizeGame(state.game, content) : createGame(startMs, deps.seed(), content);
    const opened = onOpen(state, startMs);
    state = opened.state;
    if (opened.clockWentBack) notices.push("\u7AEF\u672B\u306E\u6642\u8A08\u304C\u524D\u56DE\u3088\u308A\u524D\u3092\u6307\u3057\u3066\u3044\u307E\u3059\u3002\u96E2\u308C\u3066\u3044\u305F\u6642\u9593\u306F0\u3068\u3057\u3066\u6271\u3044\u307E\u3057\u305F\u3002");
    const awayMs = firstRun || gameReset ? 0 : opened.awayMs;
    let log = gameReset ? newPlayLog(deps.now()) : parsePlayLog(deps.read("playlog").text, deps.now());
    log.opens += 1;
    const mark = (text) => {
      log.marks.push({ atMin: Math.round(log.activeMs / 6e4 * 100) / 100, realMs: deps.now(), text });
      if (log.marks.length > MAX_MARKS) log.marks.shift();
    };
    mark(firstRun ? "\u306F\u3058\u3081\u3066\u306E\u8D77\u52D5" : gameReset ? "\u65B0\u3057\u3044\u4F5C\u308A\u306E\u30B2\u30FC\u30E0\u3092\u3001\u6700\u521D\u304B\u3089\u958B\u59CB" : `\u8D77\u52D5\uFF08${log.opens}\u56DE\u76EE\u3001\u524D\u56DE\u304B\u3089 ${formatAway(awayMs)}\uFF09`);
    const count = (name) => {
      log.counts[name] = (log.counts[name] ?? 0) + 1;
    };
    const label = (stage) => stageLabel(stage, content.params);
    const nextLabel = () => {
      const next = nextStage(game, content);
      return next === null ? "\u3059\u3079\u3066\u7A81\u7834" : label(next);
    };
    const memberName = (id) => content.byId[id]?.name ?? id;
    const starsOf = (id) => content.params.recruit.rarities[content.byId[id]?.rarity ?? ""]?.stars ?? 0;
    const isElite = (id) => content.params.recruit.rarities[content.byId[id]?.rarity ?? ""]?.elite === true;
    const dungeonName2 = (kind) => content.params.dungeon.kinds.find((d) => d.id === kind)?.name ?? kind;
    const gotText2 = (got) => {
      const parts = [];
      if (got.gold > 0) parts.push(`\u304A\u3072\u306D\u308A +${got.gold}`);
      if (got.mats > 0) parts.push(`\u76F8\u68D2\u306E\u7D20\u6750 +${got.mats}`);
      if (got.equips.length > 0) parts.push(`\u88C5\u5099 ${got.equips.length}\u3053`);
      return parts.join("\u3001") || "\u306A\u3057";
    };
    let replay = null;
    let lastDefeatStage = 0;
    const record = (events2) => {
      for (const e of events2) {
        if (e.type === "win") {
          const extra = [`\u304A\u3072\u306D\u308A +${e.reward.gold}`];
          if (e.reward.tickets > 0) extra.push(`\u901A\u5E38\u30C1\u30B1\u30C3\u30C8 +${e.reward.tickets}`);
          if (e.equipDefId !== null) extra.push(`\u88C5\u5099: ${content.equipById[e.equipDefId]?.name ?? e.equipDefId}`);
          mark(`${label(e.stage)} \u3092\u7A81\u7834\uFF08${extra.join("\u3001")}\uFF09`);
        } else if (e.type === "defeat") {
          lastDefeatStage = e.stage;
          mark(`${label(e.stage)} \u3067\u8CA0\u3051${e.timedOut ? "\uFF08\u6642\u9593\u5207\u308C\uFF09" : ""}\uFF08\u7DE8\u6210\u306E\u30EC\u30D9\u30EB\u5408\u8A08 ${partyLevels(game)}\uFF09`);
        } else if (e.type === "companion") mark(`${content.companionById[e.id]?.name ?? e.id} \u304C\u76F8\u68D2\u306B\u306A\u308B`);
        else if (e.type === "dungeonWin") mark(`${dungeonName2(e.kind)} \u6BB5\u968E${e.tier} \u3092\u7A81\u7834\uFF08${gotText2(e.got)}\uFF09`);
        else if (e.type === "dungeonDefeat") mark(`${dungeonName2(e.kind)} \u6BB5\u968E${e.tier} \u3067\u8CA0\u3051${e.timedOut ? "\uFF08\u6642\u9593\u5207\u308C\uFF09" : ""}\uFF08\u7DE8\u6210\u306E\u30EC\u30D9\u30EB\u5408\u8A08 ${partyLevels(game)}\uFF09`);
        else if (e.type === "dailyReset") mark("\u65E5\u4ED8\u304C\u5909\u308F\u308A\u3001\u65E5\u8AB2\u304C\u5165\u308C\u66FF\u308F\u3063\u305F");
        else if (e.type === "clockBack") mark("\u7AEF\u672B\u306E\u6642\u8A08\u304C\u623B\u3063\u3066\u3044\u305F");
        else if (e.type === "allClear") mark("\u3059\u3079\u3066\u306E\u9762\u3092\u7A81\u7834");
      }
    };
    const checkpoint = () => {
      const min = log.activeMs / 6e4;
      for (const c of CHECKPOINT_MINUTES) {
        if (min >= c && !log.checkpoints.includes(c)) {
          log.checkpoints.push(c);
          const actions = Object.values(log.counts).reduce((a, b) => a + b, 0);
          mark(
            `\u25A0 \u904A\u3093\u3067${c}\u5206: \u6B21\u306F ${nextLabel()}\uFF08\u7A81\u7834 ${game.highestCleared}\u9762\u3001\u56E3\u54E1 ${ownedCount(game)}\u4EBA\u3001\u76F8\u68D2 ${Object.keys(game.companions).length}\u4F53\u3001\u52E7\u8A98 ${game.counters.recruits}\u56DE\u3001\u7DE8\u6210\u306E\u30EC\u30D9\u30EB\u5408\u8A08 ${partyLevels(game)}\u3001\u88C5\u5099 ${equippedCount(game)}\u304B\u6240\u3001\u64CD\u4F5C ${actions}\u56DE\u3001\u8CA0\u3051 ${game.stats.defeats}\u56DE\uFF09`
          );
        }
      }
    };
    const save = () => {
      deps.write("playlog", JSON.stringify(log));
      if (deps.debug) deps.write("debug", JSON.stringify({ offsetMs }));
      if (!canSave) return;
      const t = now();
      state = { ...state, game, lastSeenAtMs: Math.max(state.lastSeenAtMs, t) };
      saveText = serialize(state, t);
      lastSaveOk = deps.write("save", saveText).ok;
    };
    const tick = () => {
      const real = deps.now();
      const dt = real - lastReal;
      lastReal = real;
      const active = dt > 0 && dt < ACTIVE_GAP_MS;
      if (active && speed !== 1) offsetMs += dt * (speed - 1);
      const t = real + offsetMs;
      const step = advance(game, t, deps.dayKey(t), content);
      game = step.game;
      if (game.battle === null) replay = null;
      if (active) log.activeMs += dt;
      record(step.events);
      checkpoint();
      return step.events;
    };
    const act = (name, run) => {
      const result = run(game);
      if (result.ok) {
        game = result.game;
        state = onTap(state, now());
        count(name);
        save();
      }
      return result;
    };
    const session = {
      content,
      game: () => game,
      state: () => state,
      notices: () => notices.slice(),
      canSave: () => canSave,
      firstRun: () => firstRun,
      awayMs: () => awayMs,
      now,
      speed: () => speed,
      playLog: () => log,
      saveText: () => saveText,
      lastSaveOk: () => lastSaveOk,
      replay: () => {
        const b = game.battle;
        if (replay === null || b === null || b.stage !== replay.stage) return null;
        return { ...replay, startedAtMs: b.startedAtMs, endsAtMs: b.endsAtMs };
      },
      tick,
      challenge: () => {
        const r = act("\u6311\u6226", (g) => challenge(g, now(), content));
        if (r.ok && r.stage !== void 0 && r.replay && r.allies && r.enemies && r.startedAtMs !== void 0 && r.endsAtMs !== void 0) {
          replay = { stage: r.stage, title: label(r.stage), dungeon: false, startedAtMs: r.startedAtMs, endsAtMs: r.endsAtMs, replay: r.replay, allies: r.allies, enemies: r.enemies, companion: r.companion ?? null };
          if (r.stage === lastDefeatStage) mark(`\u518D\u6311\u6226: ${label(r.stage)}\uFF08\u7DE8\u6210\u306E\u30EC\u30D9\u30EB\u5408\u8A08 ${partyLevels(game)}\uFF09`);
        }
        return r;
      },
      challengeDungeon: (kind) => {
        const r = act("\u30C0\u30F3\u30B8\u30E7\u30F3\u306B\u6311\u6226", (g) => challengeDungeon(g, kind, now(), content));
        if (r.ok && r.stage !== void 0 && r.replay && r.allies && r.enemies && r.startedAtMs !== void 0 && r.endsAtMs !== void 0) {
          const tier = game.battle?.dungeon?.tier ?? 0;
          replay = { stage: r.stage, title: `${dungeonName2(kind)} \u6BB5\u968E${tier}`, dungeon: true, startedAtMs: r.startedAtMs, endsAtMs: r.endsAtMs, replay: r.replay, allies: r.allies, enemies: r.enemies, companion: r.companion ?? null };
        }
        return r;
      },
      sweepDungeon: (kind) => {
        const r = act("\u6E05\u6383", (g) => sweepDungeon(g, kind, content));
        if (r.ok && r.got) mark(`\u6E05\u6383: ${dungeonName2(kind)} \u6BB5\u968E${r.tier ?? 0}\uFF08${gotText2(r.got)}\uFF09`);
        return r;
      },
      collectIdle: () => {
        const pending = idlePending(game, now(), content);
        const r = act("\u7BB1\u306E\u53D7\u3051\u53D6\u308A", (g) => collectIdle(g, now(), content));
        if (r.ok) {
          const equips = (r.equips ?? []).length;
          mark(`\u7BB1\u304B\u3089\u53D7\u3051\u53D6\u308A: \u304A\u3072\u306D\u308A ${r.gold ?? 0}${equips > 0 ? `\u3001\u88C5\u5099 ${equips}\u3053` : ""}\uFF08\u8CAF\u3081\u3066\u3044\u305F\u6642\u9593 ${formatAway(pending.elapsedMs)}${pending.capped ? "\u3001\u4E0A\u9650" : ""}\uFF09`);
        }
        return r;
      },
      levelUpTo: (id, target, how) => {
        const r = act(`\u7A3D\u53E4\uFF08${how}\uFF09`, (g) => levelUpTo(g, id, target, content));
        if (r.ok && how !== "+1") mark(`\u7A3D\u53E4\uFF08${how}\uFF09: ${memberName(id)} \u3092 Lv${target} \u306B\uFF08+${r.levels ?? 0}\uFF09`);
        return r;
      },
      resetLevel: (id) => {
        const before = game.members[id]?.level ?? 0;
        const r = act("\u30EA\u30BB\u30C3\u30C8", (g) => resetLevel(g, id, content));
        if (r.ok) mark(`\u30EA\u30BB\u30C3\u30C8: ${memberName(id)}\uFF08Lv${before} \u2192 1\u3001\u304A\u3072\u306D\u308A +${r.refund ?? 0}\uFF09`);
        return r;
      },
      promote: (id) => {
        const r = act("\u6607\u683C", (g) => promote(g, id, content));
        if (r.ok) mark(`${memberName(id)} \u3092\u6607\u683C\uFF08+${game.members[id]?.plus ?? 0}\uFF09`);
        return r;
      },
      recruit: (banner, n) => {
        const name = `\u52E7\u8A98\uFF08${banner === "premium" ? "\u9AD8\u7D1A" : "\u901A\u5E38"}\u30FB${n === 10 ? "10\u9023" : "1\u56DE"}\uFF09`;
        const r = act(name, (g) => recruit(g, banner, n, content));
        if (r.ok && r.results) {
          const results = r.results;
          if (results.length === 1) {
            const x = results[0];
            if (x) mark(`${name}: ${memberName(x.id)} \u2605${starsOf(x.id)}${isElite(x.id) ? "\u30A8\u30EA\u30FC\u30C8" : ""}${x.duplicate ? "\uFF08\u304B\u3051\u3089\uFF09" : "\uFF08\u65B0\u3057\u3044\u56E3\u54E1\uFF09"}`);
          } else {
            const by = [3, 2, 1].map((s) => `\u2605${s} \xD7${results.filter((x) => starsOf(x.id) === s).length}`).join("\u3001");
            const top = results.filter((x) => starsOf(x.id) >= 3).map((x) => `${memberName(x.id)}${isElite(x.id) ? "\uFF08\u30A8\u30EA\u30FC\u30C8\uFF09" : ""}`);
            const fresh = results.filter((x) => !x.duplicate).length;
            mark(`${name}: ${by}\uFF08\u65B0\u3057\u3044\u56E3\u54E1 ${fresh}\u4EBA${top.length > 0 ? `\u3002\u26053: ${top.join("\u3001")}` : ""}\uFF09`);
          }
        }
        return r;
      },
      setSlot: (slot, id) => act("\u7DE8\u6210", (g) => setPartySlot(g, slot, id)),
      setCompanion: (id) => {
        const r = act("\u76F8\u68D2\u306E\u5165\u308C\u66FF\u3048", (g) => setCompanion(g, id));
        if (r.ok) mark(id === null ? "\u76F8\u68D2\u3092\u7DE8\u6210\u304B\u3089\u5916\u3057\u305F" : `${content.companionById[id]?.name ?? id} \u3092\u7DE8\u6210\u306B\u5165\u308C\u305F`);
        return r;
      },
      companionLevelUp: (id) => {
        const r = act("\u76F8\u68D2\u306E\u30EC\u30D9\u30EB\u4E0A\u3052", (g) => companionLevelUp(g, id, content));
        if (r.ok) mark(`${content.companionById[id]?.name ?? id} \u3092 Lv${game.companions[id]?.level ?? 0} \u306B`);
        return r;
      },
      equip: (uid, memberId) => act("\u88C5\u5099\u306E\u4ED8\u3051\u66FF\u3048", (g) => equipItem(g, uid, memberId, content)),
      unequip: (uid) => act("\u88C5\u5099\u3092\u5916\u3059", (g) => unequipItem(g, uid)),
      unequipAll: (memberId) => {
        const r = act("\u88C5\u5099\u3092\u5168\u90E8\u5916\u3059", (g) => unequipAll(g, memberId));
        if (r.ok) mark(`\u88C5\u5099\u3092\u5168\u90E8\u5916\u3059: ${memberName(memberId)}\uFF08${r.removed ?? 0}\u3053\uFF09`);
        return r;
      },
      enhance: (uid) => act("\u88C5\u5099\u306E\u5F37\u5316", (g) => enhanceEquip(g, uid, content)),
      autoEquip: (memberId) => act("\u304A\u307E\u304B\u305B\u88C5\u5099\uFF081\u4EBA\uFF09", (g) => autoEquip(g, memberId, content)),
      claimMission: (id) => {
        const r = act("\u30DF\u30C3\u30B7\u30E7\u30F3\u306E\u53D7\u3051\u53D6\u308A", (g) => claimMission(g, id, content));
        if (r.ok) mark(`\u30DF\u30C3\u30B7\u30E7\u30F3\u9054\u6210: ${content.missions.find((m) => m.id === id)?.text ?? id}`);
        return r;
      },
      claimDaily: (id) => {
        const r = act("\u65E5\u8AB2\u306E\u53D7\u3051\u53D6\u308A", (g) => claimDaily(g, id, content));
        if (r.ok) mark(`\u65E5\u8AB2\u3092\u9054\u6210: ${content.dailies.find((m) => m.id === id)?.text ?? id}`);
        return r;
      },
      save,
      exportSave: () => {
        save();
        return saveText;
      },
      importSave: (text) => {
        const r = deserialize(text.trim());
        if (r.kind === "empty") return { ok: false, reason: "\u4F55\u3082\u5165\u3063\u3066\u3044\u307E\u305B\u3093" };
        if (r.kind === "corrupt") return { ok: false, reason: r.reason };
        if (r.kind === "too_new") return { ok: false, reason: `\u3053\u306E\u30D3\u30EB\u30C9\u3088\u308A\u65B0\u3057\u3044\u7248\uFF08\u7248${r.version}\uFF09\u306E\u30BB\u30FC\u30D6\u3067\u3059` };
        if (r.gameReset) return { ok: false, reason: "\u524D\u306E\u4F5C\u308A\u306E\u30B2\u30FC\u30E0\u306E\u30BB\u30FC\u30D6\u306A\u306E\u3067\u3001\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093" };
        if (!canSave) return { ok: false, reason: "\u3044\u307E\u306F\u4FDD\u5B58\u3092\u6B62\u3081\u3066\u3044\u308B\u306E\u3067\u3001\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093" };
        save();
        if (saveText !== "") deps.backup(saveText, now());
        state = r.state;
        game = state.game ? sanitizeGame(state.game, content) : createGame(now(), deps.seed(), content);
        replay = null;
        lastDefeatStage = 0;
        mark("\u30BB\u30FC\u30D6\u3092\u8AAD\u307F\u8FBC\u3093\u3060");
        save();
        return { ok: true };
      },
      debugSetSpeed: (n) => {
        if (!deps.debug || !Number.isFinite(n) || n < 1 || n > 100) return;
        speed = n;
        if (n !== 1 && !log.debugUsed) {
          log.debugUsed = true;
          mark(`\u30C7\u30D0\u30C3\u30B0: \u901F\u5EA6\u3092 ${n}\u500D\u306B`);
        }
      },
      debugAddTime: (ms) => {
        if (!deps.debug || !Number.isFinite(ms) || ms <= 0) return;
        offsetMs += ms;
        log.debugUsed = true;
        mark(`\u30C7\u30D0\u30C3\u30B0: \u6642\u9593\u3092 ${formatAway(ms)} \u9001\u3063\u305F`);
        save();
      },
      debugGrant: (grant2) => {
        if (!deps.debug) return;
        const n = (v) => typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
        const mats = n(grant2.mats);
        const materials = { ...game.materials };
        if (mats > 0) for (const id of Object.keys(game.companions)) materials[id] = (materials[id] ?? 0) + mats;
        game = { ...game, gold: game.gold + n(grant2.gold), tickets: game.tickets + n(grant2.tickets), premiumTickets: game.premiumTickets + n(grant2.premiumTickets), materials };
        log.debugUsed = true;
        mark(`\u30C7\u30D0\u30C3\u30B0: \u304A\u3072\u306D\u308A +${n(grant2.gold)}\u3001\u901A\u5E38\u30C1\u30B1\u30C3\u30C8 +${n(grant2.tickets)}\u3001\u9AD8\u7D1A\u30C1\u30B1\u30C3\u30C8 +${n(grant2.premiumTickets)}\u3001\u76F8\u68D2\u306E\u7D20\u6750 +${mats}`);
        save();
      },
      debugReset: () => {
        if (!deps.debug) return;
        save();
        if (saveText !== "") deps.backup(saveText, now());
        const t = now();
        state = { ...createInitialState(t, deps.seed()), opens: 1 };
        game = createGame(t, deps.seed(), content);
        replay = null;
        lastDefeatStage = 0;
        log = newPlayLog(deps.now());
        log.opens = 1;
        mark("\u30C7\u30D0\u30C3\u30B0: \u6700\u521D\u304B\u3089\u3084\u308A\u76F4\u3057");
        canSave = true;
        save();
      }
    };
    return session;
  }
  function playLogLines(log, game, content) {
    const lines = [];
    const p = content.params;
    const minutes = log.activeMs / 6e4;
    const actions = Object.values(log.counts).reduce((a, b) => a + b, 0);
    const next = nextStage(game, content);
    const rarityOf = (id) => p.recruit.rarities[content.byId[id]?.rarity ?? ""]?.label ?? "";
    lines.push(`\u904A\u3093\u3060\u6642\u9593: ${minutes.toFixed(1)}\u5206\uFF08\u8D77\u52D5 ${log.opens}\u56DE\uFF09`);
    lines.push(`\u6B21\u306E\u9762: ${next === null ? "\u3059\u3079\u3066\u7A81\u7834" : stageLabel(next, p)}\uFF08\u7A81\u7834 ${game.highestCleared}\u9762\uFF09`);
    lines.push(`\u56E3\u54E1: ${ownedCount(game)}\u4EBA \uFF0F \u76F8\u68D2: ${Object.keys(game.companions).length}\u4F53 \uFF0F \u6226\u95D8 ${game.stats.battles}\u56DE\uFF08\u8CA0\u3051 ${game.stats.defeats}\u56DE\uFF09`);
    lines.push(
      `\u52E7\u8A98 ${game.counters.recruits}\u56DE \uFF0F \u30EC\u30D9\u30EB\u4E0A\u3052 \u5408\u8A08 ${game.counters.levelUps} \uFF0F \u30EA\u30BB\u30C3\u30C8 ${game.counters.resets}\u56DE \uFF0F \u6607\u683C ${game.counters.promotes}\u56DE \uFF0F \u88C5\u5099\u306E\u5F37\u5316 ${game.counters.enhances}\u56DE \uFF0F \u7BB1\u306E\u53D7\u3051\u53D6\u308A ${game.counters.idleClaims}\u56DE \uFF0F \u30DF\u30C3\u30B7\u30E7\u30F3 ${game.missionsClaimed.length}\u4EF6`
    );
    lines.push(
      `\u7DE8\u6210: ${game.party.map((id) => id === null ? "\u7A7A\u304D" : `${content.byId[id]?.name ?? id}\uFF08${rarityOf(id)}\u3001Lv${game.members[id]?.level ?? 0}\uFF09`).join("\u3001")}`
    );
    lines.push(`\u88C5\u5099: \u6301\u3063\u3066\u3044\u308B ${game.equips.length}\u3053\u3001\u7DE8\u6210\u304C\u4ED8\u3051\u3066\u3044\u308B ${equippedCount(game)}\u304B\u6240`);
    lines.push(`\u64CD\u4F5C: \u5408\u8A08 ${actions}\u56DE\uFF081\u5206\u3042\u305F\u308A ${minutes > 0 ? (actions / minutes).toFixed(1) : "-"}\u56DE\uFF09`);
    lines.push(`\u64CD\u4F5C\u306E\u5185\u8A33: ${Object.entries(log.counts).map(([k, v]) => `${k} ${v}`).join("\u3001") || "\u306A\u3057"}`);
    lines.push(`\u30C7\u30D0\u30C3\u30B0\u6A5F\u80FD\u306E\u4F7F\u7528: ${log.debugUsed ? "\u3042\u308A\uFF08\u3053\u306E\u8A18\u9332\u306F\u63A1\u70B9\u306B\u4F7F\u308F\u306A\u3044\uFF09" : "\u306A\u3057"}`);
    lines.push("\u51FA\u6765\u4E8B:");
    for (const m of log.marks) {
      const mm = Math.floor(m.atMin);
      const ss = String(Math.floor((m.atMin - mm) * 60)).padStart(2, "0");
      lines.push(`  ${String(mm).padStart(3, " ")}:${ss}  ${m.text}`);
    }
    return lines;
  }

  // src/ui/storage.ts
  var KEYS = {
    save: "idle-game.save",
    playlog: "idle-game.playlog",
    debug: "idle-game.debug"
  };
  var BACKUP_PREFIX = "idle-game.save.backup.";
  var MAX_BACKUPS = 5;
  function readStore(key) {
    try {
      return { text: window.localStorage.getItem(KEYS[key]) };
    } catch (e) {
      return { text: null, error: describe(e) };
    }
  }
  function writeStore(key, text) {
    try {
      window.localStorage.setItem(KEYS[key], text);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: describe(e) };
    }
  }
  function backupSave(text, nowMs) {
    try {
      const ls = window.localStorage;
      ls.setItem(BACKUP_PREFIX + String(nowMs), text);
      const old = [];
      for (let i = 0; i < ls.length; i++) {
        const k = ls.key(i);
        if (k !== null && k.startsWith(BACKUP_PREFIX)) old.push(k);
      }
      old.sort((a, b) => Number(a.slice(BACKUP_PREFIX.length)) - Number(b.slice(BACKUP_PREFIX.length)));
      while (old.length > MAX_BACKUPS) {
        const k = old.shift();
        if (k !== void 0) ls.removeItem(k);
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: describe(e) };
    }
  }
  async function requestPersistence() {
    try {
      if (navigator.storage && typeof navigator.storage.persist === "function") {
        return await navigator.storage.persist();
      }
    } catch {
    }
    return null;
  }
  function isStandalone() {
    const nav = navigator;
    if (nav.standalone === true) return true;
    try {
      return window.matchMedia("(display-mode: standalone)").matches;
    } catch {
      return false;
    }
  }
  function describe(e) {
    return e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }

  // src/ui/texts.ts
  var ROLE_LABEL = {
    tank: "\u76FE\u5F79",
    attacker: "\u653B\u6483\u5F79",
    healer: "\u56DE\u5FA9\u5F79",
    support: "\u652F\u63F4\u5F79"
  };
  var TRAIT_LABEL = {
    taunt: "\u6311\u767A",
    backline: "\u5F8C\u5217\u306D\u3089\u3044"
  };
  var TRAIT_TEXT = {
    taunt: "\u751F\u304D\u3066\u3044\u308B\u9593\u3001\u6575\u306F\u3053\u306E\u56E3\u54E1\u3092\u5148\u306B\u72D9\u3046\u3002",
    backline: "\u6575\u306E\u5F8C\u5217\u3092\u5148\u306B\u72D9\u3046\u3002"
  };
  var SKILL_LABEL = {
    strike: "\u5F37\u6253",
    aoe: "\u5168\u4F53\u653B\u6483",
    heal: "\u56DE\u5FA9",
    healall: "\u5168\u4F53\u56DE\u5FA9",
    selfheal: "\u7ACB\u3066\u76F4\u3057",
    rally: "\u9F13\u821E"
  };
  var percent = (v) => `${Math.round(v * 100)}%`;
  var times = (v) => String(Math.round(v * 100) / 100);
  function skillText(skill, rallySec) {
    switch (skill.type) {
      case "strike":
        return `\u65751\u4F53\u306B\u3001\u653B\u6483\u306E ${times(skill.power)}\u500D \u306E\u30C0\u30E1\u30FC\u30B8\u3002`;
      case "aoe":
        return `\u6575\u5168\u54E1\u306B\u3001\u653B\u6483\u306E ${times(skill.power)}\u500D \u306E\u30C0\u30E1\u30FC\u30B8\u3002`;
      case "heal":
        return `\u3044\u3061\u3070\u3093\u50B7\u3064\u3044\u305F\u5473\u65B9\u3092\u3001\u653B\u6483\u306E ${times(skill.power)}\u500D \u56DE\u5FA9\u3002`;
      case "healall":
        return `\u5473\u65B9\u5168\u54E1\u3092\u3001\u653B\u6483\u306E ${times(skill.power)}\u500D \u56DE\u5FA9\u3002`;
      case "selfheal":
        return `\u81EA\u5206\u306E\u4F53\u529B\u3092\u3001\u6700\u5927\u306E ${percent(skill.power)} \u56DE\u5FA9\u3002`;
      case "rally":
        return `${rallySec}\u79D2\u9593\u3001\u5473\u65B9\u5168\u54E1\u306E\u4E0E\u3048\u308B\u30C0\u30E1\u30FC\u30B8\u304C ${percent(skill.power)} \u5897\u3048\u308B\u3002`;
    }
  }
  function companionSkillText(def, power, rallySec) {
    const every = `${def.interval}\u79D2\u3054\u3068\u306B\u3001`;
    switch (def.skill.type) {
      case "strike":
        return `${every}\u65751\u4F53\u306B\u3001\u56E3\u54E1\u306E\u5E73\u5747\u306E\u653B\u6483\u306E ${times(power)}\u500D \u306E\u30C0\u30E1\u30FC\u30B8\u3002`;
      case "aoe":
        return `${every}\u6575\u5168\u54E1\u306B\u3001\u56E3\u54E1\u306E\u5E73\u5747\u306E\u653B\u6483\u306E ${times(power)}\u500D \u306E\u30C0\u30E1\u30FC\u30B8\u3002`;
      case "rally":
        return `${every}${rallySec}\u79D2\u9593\u3001\u5473\u65B9\u5168\u54E1\u306E\u4E0E\u3048\u308B\u30C0\u30E1\u30FC\u30B8\u304C ${percent(power)} \u5897\u3048\u308B\u3002`;
      default:
        return `${every}\u5473\u65B9\u5168\u54E1\u3092\u3001\u56E3\u54E1\u306E\u5E73\u5747\u306E\u653B\u6483\u306E ${times(power)}\u500D \u56DE\u5FA9\u3002`;
    }
  }
  function passiveText(def, level) {
    const parts = [];
    if (def.passiveHp > 0) parts.push(`\u4F53\u529B +${percent(def.passiveHp * level)}`);
    if (def.passiveAtk > 0) parts.push(`\u653B\u6483 +${percent(def.passiveAtk * level)}`);
    return parts.length === 0 ? "\u306A\u3057" : `\u56E3\u54E1\u5168\u54E1\u306E ${parts.join("\u3001")}`;
  }
  function rewardText(r) {
    const parts = [];
    if (r.gold > 0) parts.push(`\u304A\u3072\u306D\u308A ${formatNumber(r.gold)}`);
    if (r.premiumTickets > 0) parts.push(`\u9AD8\u7D1A\u30C1\u30B1\u30C3\u30C8 ${r.premiumTickets}\u679A`);
    if (r.tickets > 0) parts.push(`\u901A\u5E38\u30C1\u30B1\u30C3\u30C8 ${r.tickets}\u679A`);
    if (r.mats > 0) parts.push(`\u76F8\u68D2\u306E\u7D20\u6750 ${r.mats}\u3053`);
    return parts.length === 0 ? "\u306A\u3057" : parts.join("\u3001");
  }
  function starsText(n) {
    return "\u2605".repeat(Math.max(0, n));
  }
  function rarityText(def, p) {
    const r = p.recruit.rarities[def.rarity];
    if (!r) return "";
    return `${starsText(r.stars)}${r.elite ? " \u30A8\u30EA\u30FC\u30C8" : ""}`;
  }
  function plusText(plus) {
    return plus > 0 ? `+${plus}` : "";
  }
  var SLOT_LABEL = {
    weapon: "\u6B66\u5668",
    costume: "\u8863\u88C5",
    prop: "\u5C0F\u9053\u5177",
    charm: "\u304A\u5B88\u308A"
  };
  function equipName(def, level) {
    return `${def.name} ${starsText(def.stars)}${level > 0 ? ` +${level}` : ""}`;
  }
  function equipEffectText(def, level, p) {
    const bonus = equipBonus(def, level, p);
    return `${EQUIP_STAT[def.slot] === "hp" ? "\u4F53\u529B" : "\u653B\u6483"} +${Math.round(bonus * 1e3) / 10}%`;
  }
  function skillLabelOf(kind) {
    if (kind === "attack" || kind === "down") return null;
    return SKILL_LABEL[kind];
  }
  var ENEMY_NAMES = ["\u3053\u3046\u3082\u308A", "\u304D\u306E\u3053", "\u304A\u304A\u306D\u305A\u307F", "\u3044\u3070\u3089", "\u304B\u304B\u3057", "\u3072\u3068\u3060\u307E"];
  function fighterName(key, content) {
    const member = content.byId[key];
    if (member) return member.name;
    const companion = content.companionById[key];
    if (companion) return companion.name;
    const m = /^enemy-(\d+)$/.exec(key);
    if (m) return ENEMY_NAMES[(Number(m[1]) - 1) % ENEMY_NAMES.length] ?? "\u307E\u3082\u306E";
    return "\u30DC\u30B9";
  }
  function formatNumber(n) {
    if (n < 1e4) return String(Math.floor(n));
    if (n < 1e8) return `${(n / 1e4).toFixed(n < 1e5 ? 2 : 1)}\u4E07`;
    return `${(n / 1e8).toFixed(2)}\u5104`;
  }
  function formatDuration(ms) {
    const sec = Math.floor(ms / 1e3);
    if (sec < 60) return `${sec}\u79D2`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}\u5206`;
    const hours = Math.floor(min / 60);
    if (hours < 48) return `${hours}\u6642\u9593${min % 60}\u5206`;
    return `${Math.floor(hours / 24)}\u65E5`;
  }
  function escapeHtml(text) {
    return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
  }

  // src/ui/battleview.ts
  var FRESH_SEC = 0.6;
  function div(className, text) {
    const el = document.createElement("div");
    el.className = className;
    if (text !== void 0) el.textContent = text;
    return el;
  }
  function createBattleView(root, onFx = () => void 0) {
    root.textContent = "";
    const rows = {};
    const order = [
      [1, 1],
      [1, 0],
      [0, 0],
      [0, 1]
    ];
    const mid = div("fmid");
    const chip = div("stage-chip");
    chip.dataset["testid"] = "battle-stage";
    const companionChip = div("comp-chip");
    companionChip.dataset["testid"] = "battle-companion";
    companionChip.hidden = true;
    const timer = div("timer");
    timer.dataset["testid"] = "battle-timer";
    const midLeft = div("fmid-left");
    midLeft.append(chip, companionChip);
    mid.append(midLeft, timer);
    order.forEach(([side, row], i) => {
      const el = div("frow");
      el.dataset["side"] = String(side);
      el.dataset["row"] = String(row);
      rows[`${side}-${row}`] = el;
      root.appendChild(el);
      if (i === 1) root.appendChild(mid);
    });
    const banner = div("banner");
    banner.dataset["testid"] = "battle-banner";
    banner.hidden = true;
    root.appendChild(banner);
    let current = null;
    let units = [[], []];
    let gaugeMax = 100;
    let next = 0;
    let finished = false;
    let lastSkillKey = "";
    const makeUnit = (spec, side, index2, b) => {
      const el = div(`unit${side === 1 && b.boss ? " boss" : ""}${spec.trait ? ` trait-${spec.trait}` : ""}`);
      el.dataset["testid"] = `unit-${side}-${index2}`;
      const art = b.art ? b.art(spec.key) : null;
      if (art !== null) {
        el.classList.add("has-art");
        const img = document.createElement("img");
        img.className = "unit-art";
        img.src = art;
        img.alt = "";
        img.draggable = false;
        el.appendChild(img);
      }
      const name = div("unit-name", b.name(spec.key));
      const bar = div("hpbar");
      const fill = div("hpfill");
      bar.appendChild(fill);
      const hpText = div("unit-hp", String(spec.hp));
      el.append(name, bar, hpText);
      let gaugeFill = null;
      if (spec.skill !== null) {
        const g = div("gauge");
        gaugeFill = div("gaugefill");
        g.appendChild(gaugeFill);
        el.appendChild(g);
      }
      rows[`${side}-${spec.row}`].appendChild(el);
      return { el, fill, hpText, gaugeFill, maxHp: spec.hp, hp: spec.hp, gauge: 0 };
    };
    const paint = (u) => {
      const ratio = u.maxHp > 0 ? Math.max(0, Math.min(1, u.hp / u.maxHp)) : 0;
      u.fill.style.width = `${ratio * 100}%`;
      u.hpText.textContent = String(Math.max(0, Math.round(u.hp)));
      u.el.classList.toggle("down", u.hp <= 0);
      if (u.gaugeFill) u.gaugeFill.style.width = `${Math.min(1, u.gauge / gaugeMax) * 100}%`;
    };
    const pulse = (el, className, ms) => {
      el.classList.remove(className);
      void el.offsetWidth;
      el.classList.add(className);
      window.setTimeout(() => el.classList.remove(className), ms);
    };
    const float = (host, text, className) => {
      const f = div(`float ${className}`, text);
      host.appendChild(f);
      f.addEventListener("animationend", () => f.remove());
      window.setTimeout(() => f.remove(), 1200);
    };
    const apply = (e, fresh) => {
      if (!current) return;
      const byCompanion = e.actor === -1;
      const actor = byCompanion ? void 0 : units[e.side]?.[e.actor];
      const target = e.target >= 0 ? units[e.targetSide]?.[e.target] : void 0;
      if (!actor && !byCompanion) return;
      if (e.kind === "down") {
        if (actor) {
          actor.hp = 0;
          paint(actor);
        }
        return;
      }
      const skill = skillLabelOf(e.kind);
      if (actor) {
        if (e.kind === "attack") actor.gauge += current.gaugePerAttack;
        else actor.gauge = 0;
        paint(actor);
      }
      if (fresh) {
        const host = actor ? actor.el : companionChip;
        if (actor) pulse(actor.el, e.side === 0 ? "lunge-up" : "lunge-down", 220);
        else pulse(companionChip, "comp-act", 400);
        const key = `${e.t}-${e.side}-${e.actor}`;
        if (skill !== null && key !== lastSkillKey) {
          lastSkillKey = key;
          float(host, skill, "float-skill");
          onFx("skill");
        }
      }
      if (!target) return;
      const healing = e.kind === "heal" || e.kind === "healall" || e.kind === "selfheal";
      if (healing) {
        target.hp = Math.min(target.maxHp, target.hp + e.amount);
        if (fresh && e.amount > 0) {
          float(target.el, `+${e.amount}`, "float-heal");
          onFx("heal");
        }
      } else {
        target.hp = Math.max(0, target.hp - e.amount);
        if (fresh) {
          float(target.el, `-${e.amount}`, e.kind === "attack" ? "float-dmg" : "float-dmg float-big");
          pulse(target.el, "hit", 180);
          onFx("hit");
        }
      }
      paint(target);
    };
    const lineUp = (b) => {
      for (const el of Object.values(rows)) el.textContent = "";
      units = [b.allies.map((s, i) => makeUnit(s, 0, i, b)), b.enemies.map((s, i) => makeUnit(s, 1, i, b))];
      for (const side of units) for (const u of side) paint(u);
      root.style.backgroundImage = b.background ? `url("${b.background}")` : "";
      root.classList.toggle("has-bg", Boolean(b.background));
      chip.textContent = b.stageText === "" ? "" : `${b.stageText}${b.boss ? " \u30DC\u30B9" : ""}`;
      chip.hidden = b.stageText === "";
      companionChip.hidden = b.companionName === null;
      companionChip.textContent = b.companionName === null ? "" : `\u76F8\u68D2 ${b.companionName}`;
      root.classList.toggle("is-boss", b.boss);
    };
    const show = (b) => {
      current = b;
      gaugeMax = b.gaugeMax;
      next = 0;
      finished = false;
      lastSkillKey = "";
      lineUp(b);
      timer.textContent = "";
      banner.hidden = true;
    };
    const preview = (p) => {
      current = null;
      lineUp(p);
      timer.textContent = "";
      if (p.banner) {
        banner.hidden = false;
        banner.className = "banner banner-intro";
        banner.textContent = p.banner;
      } else {
        banner.hidden = true;
      }
    };
    const update = (nowMs) => {
      const b = current;
      if (!b) return;
      const t = (nowMs - b.atMs) / 1e3;
      if (t < 0) {
        banner.hidden = false;
        banner.className = "banner banner-intro";
        banner.textContent = `${b.stageText}${b.boss ? " \u30DC\u30B9\u6226" : ""}`;
        return;
      }
      if (!finished) banner.hidden = true;
      const events2 = b.replay.events;
      const visible = document.visibilityState !== "hidden";
      while (next < events2.length && events2[next].t <= t) {
        const e = events2[next];
        apply(e, visible && t - e.t < FRESH_SEC);
        next += 1;
      }
      const shown = Math.min(t, b.replay.durationSec);
      timer.textContent = `${Math.floor(shown)}\u79D2 / ${b.timeLimitSec}\u79D2`;
      if (!finished && nowMs >= b.endsAtMs) {
        finished = true;
        banner.hidden = false;
        if (b.replay.win) {
          banner.className = "banner banner-win";
          banner.textContent = "\u52DD\u5229\uFF01";
        } else {
          banner.className = "banner banner-lose";
          banner.textContent = b.replay.timedOut ? "\u6642\u9593\u5207\u308C\u2026" : "\u8CA0\u3051\u2026";
        }
      }
    };
    return { show, preview, update };
  }

  // src/ui/art.ts
  var available = /* @__PURE__ */ new Set();
  var version = "";
  function setArt(ids, buildId) {
    available = new Set(ids);
    version = encodeURIComponent(buildId);
  }
  function artUrl(id) {
    return available.has(id) ? `img/${id}.webp?v=${version}` : null;
  }
  var ENEMY_ART = ["e_bat", "e_mushroom", "e_rat", "e_thorn", "e_scarecrow", "e_wisp"];
  function fighterArtId(key) {
    const m = /^enemy-(\d+)$/.exec(key);
    if (m) return ENEMY_ART[(Number(m[1]) - 1) % ENEMY_ART.length] ?? null;
    return key;
  }

  // src/ui/sound.ts
  var STORE_KEY = "idle-game.sound";
  var MIN_GAP = {
    tap: 40,
    hit: 70,
    skill: 150,
    heal: 150,
    win: 500,
    lose: 500,
    gacha: 300,
    gachaRare: 300,
    levelup: 80,
    coin: 120,
    error: 200
  };
  var ctx = null;
  var master = null;
  var enabled = true;
  var lastAt = {};
  function readSetting() {
    try {
      return localStorage.getItem(STORE_KEY) !== "off";
    } catch {
      return true;
    }
  }
  function initSound() {
    enabled = readSetting();
  }
  function soundEnabled() {
    return enabled;
  }
  function setSoundEnabled(on) {
    enabled = on;
    try {
      localStorage.setItem(STORE_KEY, on ? "on" : "off");
    } catch {
    }
  }
  function unlockSound() {
    try {
      if (ctx === null) {
        const AC = window.AudioContext ?? window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.35;
        master.connect(ctx.destination);
      }
      if (ctx.state === "suspended") void ctx.resume();
    } catch {
      ctx = null;
    }
  }
  function tone(c, out, freq, start2, dur, type, vol, slideTo) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, start2);
    if (slideTo !== void 0) o.frequency.exponentialRampToValueAtTime(slideTo, start2 + dur);
    g.gain.setValueAtTime(1e-4, start2);
    g.gain.exponentialRampToValueAtTime(vol, start2 + 0.01);
    g.gain.exponentialRampToValueAtTime(1e-4, start2 + dur);
    o.connect(g);
    g.connect(out);
    o.start(start2);
    o.stop(start2 + dur + 0.02);
  }
  function noise(c, out, start2, dur, vol, cutoff) {
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = cutoff;
    const g = c.createGain();
    g.gain.value = vol;
    src.connect(f);
    f.connect(g);
    g.connect(out);
    src.start(start2);
  }
  function play(name) {
    if (!enabled || ctx === null || master === null || ctx.state !== "running") return;
    const nowMs = performance.now();
    if (nowMs - (lastAt[name] ?? -1e9) < MIN_GAP[name]) return;
    lastAt[name] = nowMs;
    const c = ctx;
    const out = master;
    const t = c.currentTime + 5e-3;
    switch (name) {
      case "tap":
        tone(c, out, 1400, t, 0.045, "triangle", 0.25);
        break;
      case "hit":
        noise(c, out, t, 0.07, 0.5, 1800);
        tone(c, out, 220, t, 0.06, "square", 0.08, 120);
        break;
      case "skill":
        tone(c, out, 500, t, 0.18, "sawtooth", 0.12, 1400);
        noise(c, out, t + 0.05, 0.12, 0.3, 3500);
        break;
      case "heal":
        tone(c, out, 880, t, 0.16, "sine", 0.22);
        tone(c, out, 1320, t + 0.07, 0.18, "sine", 0.16);
        break;
      case "win":
        [523, 659, 784, 1047].forEach((f, i) => tone(c, out, f, t + i * 0.09, 0.22, "triangle", 0.3));
        break;
      case "lose":
        [392, 330, 262].forEach((f, i) => tone(c, out, f, t + i * 0.14, 0.28, "triangle", 0.25));
        break;
      case "gacha":
        [784, 988, 1175, 1568].forEach((f, i) => tone(c, out, f, t + i * 0.06, 0.14, "sine", 0.22));
        break;
      case "gachaRare":
        [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(c, out, f, t + i * 0.07, 0.3, "triangle", 0.28));
        noise(c, out, t + 0.4, 0.4, 0.15, 6e3);
        break;
      case "levelup":
        tone(c, out, 660, t, 0.08, "square", 0.1);
        tone(c, out, 990, t + 0.06, 0.12, "square", 0.1);
        break;
      case "coin":
        tone(c, out, 1320, t, 0.06, "square", 0.1);
        tone(c, out, 1760, t + 0.05, 0.14, "square", 0.1);
        break;
      case "error":
        tone(c, out, 180, t, 0.16, "square", 0.12);
        break;
    }
  }

  // src/ui/views.ts
  var TABS = [
    { id: "journey", label: "\u65C5" },
    { id: "members", label: "\u56E3\u54E1" },
    { id: "party", label: "\u7DE8\u6210" },
    { id: "companions", label: "\u76F8\u68D2" },
    { id: "recruit", label: "\u52E7\u8A98" },
    { id: "missions", label: "\u30DF\u30C3\u30B7\u30E7\u30F3" }
  ];
  var BOX_BADGE_MS = 5 * 6e4;
  function tags(def) {
    const trait = def.trait ? `<span class="tag tag-trait">${TRAIT_LABEL[def.trait]}</span>` : "";
    return `<span class="tag">${ROLE_LABEL[def.role]}</span>${trait}`;
  }
  function nameHtml(def, plus, ctx2) {
    const r = ctx2.params.recruit.rarities[def.rarity];
    const cls = r ? `rar rar-${r.stars}${r.elite ? " rar-elite" : ""}` : "rar";
    const p = plusText(plus);
    return `${escapeHtml(def.name)}${p ? ` <span class="plus">${p}</span>` : ""} <small class="${cls}">${rarityText(def, ctx2.params)}</small>`;
  }
  function owned(g, ctx2) {
    const list = [];
    for (const def of ctx2.members) {
      const own = g.members[def.id];
      if (!own) continue;
      const r = ctx2.params.recruit.rarities[def.rarity];
      list.push({
        def,
        level: own.level,
        plus: own.plus,
        shards: own.shards,
        inParty: g.party.includes(def.id),
        power: memberPowerNow(g, def.id, ctx2),
        stars: r?.stars ?? 0,
        elite: r?.elite === true
      });
    }
    return list.sort((a, b) => {
      if (a.inParty !== b.inParty) return a.inParty ? -1 : 1;
      if (a.inParty) return g.party.indexOf(a.def.id) - g.party.indexOf(b.def.id);
      if (a.stars !== b.stars) return b.stars - a.stars;
      if (a.elite !== b.elite) return a.elite ? -1 : 1;
      return b.level - a.level;
    });
  }
  function partyIds(g) {
    return g.party.filter((id) => id !== null);
  }
  function canTrainParty(g, ctx2) {
    return partyIds(g).some((id) => levelPlan(g, id, (g.members[id]?.level ?? 0) + 1, ctx2).ok);
  }
  function claimableCount(g, ctx2) {
    return missionList(g, ctx2).filter((m) => m.claimable).length + dailyList(g, ctx2).filter((m) => m.claimable).length;
  }
  function badges(g, ctx2, nowMs) {
    const ids = partyIds(g);
    const hasBench = ownedCount(g) > ids.length;
    const companionIds = Object.keys(g.companions);
    const companionWaiting = g.companionSlot === null && companionIds.length > 0;
    const pending = idlePending(g, nowMs, ctx2);
    return {
      // 旅の画面には、箱と、ダンジョンの入口がある
      journey: pending.capped || pending.elapsedMs >= BOX_BADGE_MS || canSweepAny(g, ctx2),
      members: canTrainParty(g, ctx2) || ids.some((id) => promoteInfo(g, id, ctx2).ok) || canAutoEquipParty(g, ctx2),
      party: g.party.includes(null) && hasBench,
      companions: companionWaiting || companionIds.some((id) => companionLevelInfo(g, id, ctx2).ok),
      // 勧誘の印は、10連を回せるときだけ（1回ずつ回せるだけでは付けない）
      recruit: g.tickets >= 10 || g.premiumTickets >= 10,
      missions: claimableCount(g, ctx2) > 0,
      dungeon: canSweepAny(g, ctx2),
      other: false
    };
  }
  function hintText(g, ctx2, nowMs) {
    const b = badges(g, ctx2, nowMs);
    if (b.missions) return "\u9054\u6210\u3057\u305F\u30DF\u30C3\u30B7\u30E7\u30F3\u304C\u3042\u308A\u307E\u3059\u3002\u4E0B\u306E\u300C\u30DF\u30C3\u30B7\u30E7\u30F3\u300D\u3067\u3001\u5831\u916C\u3092\u53D7\u3051\u53D6\u308C\u307E\u3059\u3002";
    if (g.premiumTickets >= 10) return "\u9AD8\u7D1A\u30C1\u30B1\u30C3\u30C8\u304C10\u679A\u3042\u308A\u307E\u3059\u3002\u4E0B\u306E\u300C\u52E7\u8A98\u300D\u3067\u300110\u9023\u3092\u56DE\u305B\u307E\u3059\u3002";
    if (b.recruit) return "\u901A\u5E38\u30C1\u30B1\u30C3\u30C8\u304C10\u679A\u3042\u308A\u307E\u3059\u3002\u4E0B\u306E\u300C\u52E7\u8A98\u300D\u3067\u300110\u9023\u3092\u56DE\u305B\u307E\u3059\u3002";
    if (b.party) return "\u7DE8\u6210\u306B\u7A7A\u304D\u304C\u3042\u308A\u307E\u3059\u3002\u4E0B\u306E\u300C\u7DE8\u6210\u300D\u3067\u3001\u56E3\u54E1\u3092\u5165\u308C\u307E\u3057\u3087\u3046\u3002";
    if (g.companionSlot === null && Object.keys(g.companions).length > 0) return "\u76F8\u68D2\u304C\u3044\u307E\u3059\u3002\u4E0B\u306E\u300C\u76F8\u68D2\u300D\u3067\u3001\u7DE8\u6210\u306B\u5165\u308C\u307E\u3057\u3087\u3046\u3002";
    if (canAutoEquipParty(g, ctx2)) return "\u65B0\u3057\u3044\u88C5\u5099\u304C\u3042\u308A\u307E\u3059\u3002\u4E0B\u306E\u300C\u56E3\u54E1\u300D\u3067\u56E3\u54E1\u3092\u9078\u3073\u3001\u300C\u88C5\u5099\u300D\u306E\u300C\u304A\u307E\u304B\u305B\u88C5\u5099\u300D\u3067\u4ED8\u3051\u3089\u308C\u307E\u3059\u3002";
    if (canTrainParty(g, ctx2)) return "\u304A\u3072\u306D\u308A\u304C\u3042\u308A\u307E\u3059\u3002\u4E0B\u306E\u300C\u56E3\u54E1\u300D\u3067\u3001\u7A3D\u53E4\uFF08\u30EC\u30D9\u30EB\u4E0A\u3052\uFF09\u304C\u3067\u304D\u307E\u3059\u3002";
    if (b.companions) return "\u76F8\u68D2\u3092\u80B2\u3066\u3089\u308C\u307E\u3059\u3002\u4E0B\u306E\u300C\u76F8\u68D2\u300D\u3067\u3001\u30EC\u30D9\u30EB\u3092\u4E0A\u3052\u307E\u3057\u3087\u3046\u3002";
    if (b.journey) return "\u7BB1\u306B\u3001\u304A\u3072\u306D\u308A\u304C\u8CAF\u307E\u3063\u3066\u3044\u307E\u3059\u3002\u53D7\u3051\u53D6\u3063\u3066\u3001\u56E3\u54E1\u306E\u7A3D\u53E4\u306B\u4F7F\u3044\u307E\u3057\u3087\u3046\u3002";
    return "\u300C\u6311\u6226\u300D\u3092\u62BC\u3059\u3068\u6226\u3044\u307E\u3059\u3002\u304A\u3072\u306D\u308A\u306F\u3001\u753B\u9762\u3092\u9589\u3058\u3066\u3044\u3066\u3082\u3001\u540C\u3058\u901F\u3055\u3067\u7BB1\u306B\u8CAF\u307E\u308A\u307E\u3059\u3002";
  }
  function bossWord(stage, ctx2) {
    return isBossStage(stage, ctx2.params) ? " \u306E\u30DC\u30B9" : "";
  }
  function challengeHtml(g, ctx2, ui) {
    const p = ctx2.params;
    if (g.battle !== null) {
      const bd = g.battle.dungeon;
      const where = bd ? `${escapeHtml(dungeonName(bd.kind, ctx2))} \u6BB5\u968E${bd.tier}` : `${stageLabel(g.battle.stage, p)}${bossWord(g.battle.stage, ctx2)}`;
      return `<div class="status" data-testid="status-text">${where} \u3067\u6226\u95D8\u4E2D\u2026</div><button type="button" class="btn btn-big" disabled data-testid="challenge-button">\u6226\u95D8\u4E2D</button>`;
    }
    const next = nextStage(g, ctx2);
    const parts = [];
    const r = ui.result;
    let winHtml = "";
    if (r !== null && r.type === "win") {
      const companion = r.companionId !== null ? ` ${escapeHtml(ctx2.companionById[r.companionId]?.name ?? "")} \u304C\u76F8\u68D2\u306B\u306A\u308A\u307E\u3057\u305F\uFF01` : "";
      const equip = r.equipDefId !== null ? ctx2.equipById[r.equipDefId] : void 0;
      const equipText = equip ? `\u3001\u88C5\u5099\u300C${escapeHtml(equipName(equip, 0))}\u300D` : "";
      winHtml = `<div class="result result-win" data-testid="result-win"><b>${stageLabel(r.stage, p)} \u3092\u7A81\u7834\uFF01${companion}</b><span class="mini">\u521D\u30AF\u30EA\u30A2\u5831\u916C: ${escapeHtml(rewardText(r.reward))}${equipText}</span></div>`;
    }
    if (next === null) {
      parts.push(`<div class="status" data-testid="status-text">\u3059\u3079\u3066\u306E\u9762\u3092\u7A81\u7834\u3057\u307E\u3057\u305F\u3002\u304A\u3072\u306D\u308A\u306F\u3001\u3053\u308C\u304B\u3089\u3082\u7BB1\u306B\u8CAF\u307E\u308A\u307E\u3059\u3002</div>`);
      parts.push(winHtml);
      return parts.join("");
    }
    const lost = r !== null && r.type === "defeat" && r.stage === next;
    if (r !== null && r.type === "defeat" && lost) {
      parts.push(
        `<div class="result result-lose" data-testid="result-defeat"><b>\u7A3D\u53E4\u304C\u8DB3\u308A\u306A\u3044\uFF01</b><span>${stageLabel(r.stage, p)}${bossWord(r.stage, ctx2)} \u3067\u8CA0\u3051\u307E\u3057\u305F${r.timedOut ? "\uFF08\u6642\u9593\u5207\u308C\uFF09" : ""}\u3002\u5931\u3063\u305F\u3082\u306E\u306F\u3042\u308A\u307E\u305B\u3093\u3002\u56E3\u54E1\u3092\u7A3D\u53E4\u3057\u3066\u3001\u3082\u3046\u4E00\u5EA6\u6311\u307F\u307E\u3057\u3087\u3046\u3002</span><button type="button" class="btn btn-primary btn-wide" data-action="goto-members" data-testid="goto-train">\u56E3\u54E1\u3092\u7A3D\u53E4\u3059\u308B</button></div>`
      );
    }
    const label = `${stageLabel(next, p)}${bossWord(next, ctx2)}`;
    const text = lost ? `\u3082\u3046\u4E00\u5EA6 ${label} \u306B\u6311\u6226` : g.highestCleared === 0 ? `${label} \u306B\u6311\u6226` : `\u6B21\u306E\u9762\uFF08${label}\uFF09\u306B\u6311\u6226`;
    parts.push(`<button type="button" class="btn ${lost ? "" : "btn-primary"} btn-big" data-action="challenge" data-testid="challenge-button">${text}</button>`);
    parts.push(winHtml);
    return parts.join("");
  }
  function boxHtml(g, ctx2, nowMs) {
    const p = ctx2.params;
    const pending = idlePending(g, nowMs, ctx2);
    const mats = Object.keys(pending.mats).map((id) => {
      const def = ctx2.companionById[id];
      return def ? `<span>${escapeHtml(def.material)} <b data-live="idleMats-${id}" data-testid="idle-mats-${id}"></b></span>` : "";
    }).join("");
    return `<div class="box ${pending.capped ? "box-full" : ""}" data-testid="idle-box"><div class="box-main"><div class="box-title">\u7BB1\uFF08\u653E\u7F6E\u5831\u916C\uFF09${pending.capped ? `<span class="tag tag-warn" data-testid="idle-capped">\u3044\u3063\u3071\u3044</span>` : ""}</div><div class="box-amounts"><span>\u304A\u3072\u306D\u308A <b data-live="idleGold" data-testid="idle-gold"></b></span><span>\u88C5\u5099 <b data-live="idleEquips" data-testid="idle-equips"></b></span>${mats}</div><div class="box-bar"><div class="box-fill" data-live-width="idleFill"></div></div><div class="mini">\u6BCE\u5206 +${formatNumber(idleGoldPerMin(g.highestCleared, p))} \u30FB <span data-live="idleTime"></span></div></div><button type="button" class="btn btn-primary" data-action="collect" data-testid="idle-claim">\u53D7\u3051\u53D6\u308B</button></div>`;
  }
  function journeyLive(g, ctx2, nowMs) {
    const pending = idlePending(g, nowMs, ctx2);
    const capMs = ctx2.params.economy.idleCapHours * 36e5;
    const out = {
      idleGold: formatNumber(pending.gold),
      idleEquips: String(pending.equips),
      idleFill: `${Math.round(Math.min(1, pending.elapsedMs / capMs) * 1e3) / 10}%`,
      idleTime: pending.capped ? `\u3044\u3063\u3071\u3044\uFF08${ctx2.params.economy.idleCapHours}\u6642\u9593\u3076\u3093\uFF09` : `${formatDuration(pending.elapsedMs)}\u3076\u3093 \uFF0F ${ctx2.params.economy.idleCapHours}\u6642\u9593\u307E\u3067`
    };
    for (const id of Object.keys(pending.mats)) out[`idleMats-${id}`] = String(pending.mats[id] ?? 0);
    return out;
  }
  function goalsHtml(g, ctx2) {
    const p = ctx2.params;
    const items = [];
    const missions = missionList(g, ctx2);
    const ready = missions.find((m) => m.claimable);
    const pendingMission = missions.find((m) => !m.claimed);
    if (ready) {
      items.push(
        `<button type="button" class="goal goal-ready" data-action="tab" data-tab="missions" data-testid="goal-mission"><span>\u30DF\u30C3\u30B7\u30E7\u30F3\u9054\u6210\uFF01 ${escapeHtml(ready.def.text)}</span><span class="goal-go">\u5831\u916C\u3092\u53D7\u3051\u53D6\u308B \u203A</span></button>`
      );
    } else if (pendingMission) {
      items.push(
        `<button type="button" class="goal" data-action="tab" data-tab="missions" data-testid="goal-mission"><span>\u6B21\u306E\u30DF\u30C3\u30B7\u30E7\u30F3: ${escapeHtml(pendingMission.def.text)}</span><span class="goal-go">${pendingMission.progress} / ${pendingMission.def.target}</span></button>`
      );
    }
    const goals = nextGoals(g, ctx2);
    if (goals.bossIn !== null && goals.bossStage !== null) {
      const bossChapter = chapterOf(goals.bossStage, p);
      const boss = ctx2.companions.find((c) => c.chapter === bossChapter);
      const note = boss && !g.companions[boss.id] ? "\uFF08\u5012\u3059\u3068\u76F8\u68D2\u306B\u306A\u308B\uFF09" : "";
      items.push(`<div class="goal" data-testid="goal-boss"><span>${stageLabel(goals.bossStage, p)} \u306E\u30DC\u30B9\u307E\u3067 \u3042\u3068${goals.bossIn}\u9762${note}</span></div>`);
    }
    const dailies = dailyList(g, ctx2);
    if (dailies.length > 0) {
      const done = dailies.filter((d) => d.claimed).length;
      const canClaim = dailies.some((d) => d.claimable);
      items.push(
        `<button type="button" class="goal ${canClaim ? "goal-ready" : ""}" data-action="tab" data-tab="missions" data-testid="goal-daily"><span>\u4ECA\u65E5\u306E\u65E5\u8AB2</span><span class="goal-go">${canClaim ? "\u53D7\u3051\u53D6\u308C\u307E\u3059 \u203A" : `${done} / ${dailies.length}`}</span></button>`
      );
    }
    const left = pityLeft(g, "premium", ctx2);
    if (left !== null && g.recruit.firstTenDone) {
      items.push(
        `<button type="button" class="goal" data-action="tab" data-tab="recruit" data-testid="goal-pity"><span>\u9AD8\u7D1A\u52E7\u8A98\u306E \u26053 \u78BA\u5B9A\u307E\u3067</span><span class="goal-go">\u3042\u3068 ${left}\u56DE</span></button>`
      );
    }
    return items.length > 0 ? `<div class="goals">${items.join("")}</div>` : "";
  }
  function journeyInfoHtml(g, ctx2, ui, nowMs) {
    const parts = [];
    parts.push(`<div class="challenge">${challengeHtml(g, ctx2, ui)}</div>`);
    parts.push(dungeonResultHtml(ctx2, ui));
    parts.push(boxHtml(g, ctx2, nowMs));
    parts.push(dungeonEntryHtml(g, ctx2));
    parts.push(goalsHtml(g, ctx2));
    parts.push(`<p class="hint" data-testid="hint">${escapeHtml(hintText(g, ctx2, nowMs))}</p>`);
    parts.push(`<div class="mini">\u7DE8\u6210\u306E\u6226\u529B <span data-testid="party-power">${formatNumber(partyPower(g, ctx2))}</span></div>`);
    if (ui.feed.length > 0) {
      parts.push(`<ul class="feed" data-testid="feed">${ui.feed.slice(0, 5).map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>`);
    }
    return parts.join("");
  }
  function dungeonName(kind, ctx2) {
    return ctx2.params.dungeon.kinds.find((d) => d.id === kind)?.name ?? kind;
  }
  function dungeonRewardText(r) {
    const parts = [];
    if ((r.gold ?? 0) > 0) parts.push(`\u304A\u3072\u306D\u308A ${formatNumber(r.gold ?? 0)}`);
    if ((r.mats ?? 0) > 0) parts.push(`\u76F8\u68D2\u306E\u7D20\u6750 ${r.mats}\u3053\uFF08\u76F8\u68D2\u305D\u308C\u305E\u308C\uFF09`);
    if ((r.equips ?? 0) > 0) parts.push(`\u88C5\u5099 ${r.equips}\u3053`);
    return parts.join("\u3001") || "\u306A\u3057";
  }
  function gotText(got, ctx2) {
    const parts = [];
    if (got.gold > 0) parts.push(`\u304A\u3072\u306D\u308A ${formatNumber(got.gold)}`);
    if (got.mats > 0) parts.push(`\u76F8\u68D2\u306E\u7D20\u6750 ${got.mats}\u3053\uFF08\u76F8\u68D2\u305D\u308C\u305E\u308C\uFF09`);
    if (got.equips.length > 0) parts.push(`\u88C5\u5099\u300C${got.equips.map((id) => escapeHtml(ctx2.equipById[id] ? equipName(ctx2.equipById[id], 0) : id)).join("\u300D\u300C")}\u300D`);
    return parts.join("\u3001") || "\u306A\u3057";
  }
  function dungeonEntryHtml(g, ctx2) {
    const open = ctx2.params.dungeon.kinds.filter((d) => dungeonUnlocked(g, d.id, ctx2));
    const first = ctx2.params.dungeon.kinds.slice().sort((a, b) => a.unlockStage - b.unlockStage)[0];
    const note = open.length === 0 ? first ? `${stageLabel(first.unlockStage, ctx2.params)} \u3092\u7A81\u7834\u3059\u308B\u3068\u958B\u304D\u307E\u3059` : "" : canSweepAny(g, ctx2) ? "\u6E05\u6383\u3067\u304D\u307E\u3059" : `${open.length}\u3064\u958B\u3044\u3066\u3044\u307E\u3059`;
    return `<button type="button" class="goal ${canSweepAny(g, ctx2) ? "goal-ready" : ""}" data-action="tab" data-tab="dungeon" data-testid="goto-dungeon"><span>\u30C0\u30F3\u30B8\u30E7\u30F3</span><span class="goal-go">${note} \u203A</span></button>`;
  }
  function dungeonResultHtml(ctx2, ui) {
    const r = ui.result;
    if (r === null) return "";
    if (r.type === "dungeonWin") {
      return `<div class="result result-win" data-testid="result-dungeon-win"><b>${escapeHtml(dungeonName(r.kind, ctx2))} \u6BB5\u968E${r.tier} \u3092\u7A81\u7834\uFF01</b><span class="mini">\u521D\u56DE\u306E\u5831\u916C: ${gotText(r.got, ctx2)}</span><button type="button" class="btn btn-wide" data-action="tab" data-tab="dungeon" data-testid="back-dungeon">\u30C0\u30F3\u30B8\u30E7\u30F3\u3078\u623B\u308B</button></div>`;
    }
    if (r.type === "dungeonDefeat") {
      return `<div class="result result-lose" data-testid="result-dungeon-defeat"><b>${escapeHtml(dungeonName(r.kind, ctx2))} \u6BB5\u968E${r.tier} \u3067\u8CA0\u3051\u307E\u3057\u305F${r.timedOut ? "\uFF08\u6642\u9593\u5207\u308C\uFF09" : ""}</b><span>\u5931\u3063\u305F\u3082\u306E\u306F\u3042\u308A\u307E\u305B\u3093\u3002\u6311\u6226\u306F\u4F55\u56DE\u3067\u3082\u3067\u304D\u307E\u3059\u3002</span><button type="button" class="btn btn-wide" data-action="tab" data-tab="dungeon" data-testid="back-dungeon">\u30C0\u30F3\u30B8\u30E7\u30F3\u3078\u623B\u308B</button></div>`;
    }
    return "";
  }
  function dungeonHtml(g, ctx2) {
    const p = ctx2.params;
    const busy = g.battle !== null;
    const cards = p.dungeon.kinds.map((d) => {
      const unlocked = dungeonUnlocked(g, d.id, ctx2);
      if (!unlocked) {
        return `<div class="dg-card is-locked" data-testid="dungeon-${d.id}"><h3>${escapeHtml(d.name)}</h3><p class="mini" data-testid="dungeon-lock-${d.id}">${stageLabel(d.unlockStage, p)} \u3092\u7A81\u7834\u3059\u308B\u3068\u958B\u304D\u307E\u3059</p></div>`;
      }
      const cleared = dungeonCleared(g, d.id);
      const next = d.tiers[cleared];
      const top = cleared > 0 ? d.tiers[cleared - 1] : void 0;
      const left = sweepsLeft(g, d.id, ctx2);
      const challengeBtn = next ? `<button type="button" class="btn btn-primary" data-action="dungeon-challenge" data-kind="${d.id}" data-testid="dungeon-challenge-${d.id}" ${busy ? "disabled" : ""}><span>\u6BB5\u968E${cleared + 1}\u306B\u6311\u6226</span><small>\u521D\u56DE: ${dungeonRewardText(next.first)}</small></button>` : `<p class="mini">\u3059\u3079\u3066\u306E\u6BB5\u968E\u3092\u7A81\u7834\u3057\u307E\u3057\u305F\u3002</p>`;
      const sweepBtn = top ? `<button type="button" class="btn ${left > 0 ? "btn-primary" : ""}" data-action="dungeon-sweep" data-kind="${d.id}" data-testid="dungeon-sweep-${d.id}" ${left > 0 ? "" : "disabled"}><span>\u6E05\u6383\uFF08\u6BB5\u968E${cleared}\uFF09\u3042\u3068 <b data-testid="dungeon-sweeps-${d.id}">${left}</b>\u56DE</span><small>${dungeonRewardText(top.sweep)}</small></button>` : `<p class="mini">\u6BB5\u968E1\u3092\u7A81\u7834\u3059\u308B\u3068\u3001\u6E05\u6383\u3067\u304D\u308B\u3088\u3046\u306B\u306A\u308A\u307E\u3059\u3002</p>`;
      return `<div class="dg-card" data-testid="dungeon-${d.id}"><div class="row-between"><h3>${escapeHtml(d.name)}</h3><span class="mini">\u7A81\u7834 <b data-testid="dungeon-cleared-${d.id}">${cleared}</b> / ${d.tiers.length}</span></div><div class="dg-btns">${challengeBtn}${sweepBtn}</div></div>`;
    });
    return titleRow("\u30C0\u30F3\u30B8\u30E7\u30F3", "dungeon") + (busy ? `<p class="mini" data-testid="dungeon-busy">\u6226\u95D8\u4E2D\u306F\u3001\u6311\u6226\u3067\u304D\u307E\u305B\u3093\u3002</p>` : "") + cards.join("");
  }
  var HELP_TITLE = {
    members: "\u56E3\u54E1",
    party: "\u7DE8\u6210",
    companions: "\u76F8\u68D2",
    recruit: "\u52E7\u8A98",
    missions: "\u30DF\u30C3\u30B7\u30E7\u30F3\u3068\u65E5\u8AB2",
    dungeon: "\u30C0\u30F3\u30B8\u30E7\u30F3"
  };
  function helpButton(topic) {
    return `<button type="button" class="icon-btn" data-action="help" data-topic="${topic}" data-testid="help-${topic}" aria-label="${HELP_TITLE[topic]}\u306E\u8AAC\u660E">\uFF1F</button>`;
  }
  function titleRow(title, topic, extra = "") {
    return `<div class="title-row"><h2 class="panel-title">${title}</h2>${extra}${helpButton(topic)}</div>`;
  }
  function helpNotes(g, ctx2, topic) {
    const p = ctx2.params;
    if (topic === "members") {
      return [
        "\u300C+1\u300D\u300C+10\u300D\u3067\u30EC\u30D9\u30EB\u3092\u4E0A\u3052\u307E\u3059\u3002\u300C\u6307\u5B9A\u300D\u306F\u3001\u3069\u3053\u307E\u3067\u4E0A\u3052\u308B\u304B\u3092\u6C7A\u3081\u3089\u308C\u307E\u3059\u3002",
        "\u30EA\u30BB\u30C3\u30C8\u3059\u308B\u3068\u3001\u30EC\u30D9\u30EB1\u306B\u623B\u308A\u3001\u30EC\u30D9\u30EB\u4E0A\u3052\u306B\u4F7F\u3063\u305F\u304A\u3072\u306D\u308A\u304C\u5168\u90E8\u623B\u308A\u307E\u3059\u3002\u6607\u683C\u3068\u88C5\u5099\u306F\u3001\u305D\u306E\u307E\u307E\u3067\u3059\u3002\u4F55\u56DE\u3067\u3082\u3001\u305F\u3060\u3067\u3067\u304D\u307E\u3059\u3002",
        "\u540C\u3058\u56E3\u54E1\u304C\u52E7\u8A98\u3067\u91CD\u306A\u308B\u3068\u300C\u304B\u3051\u3089\u300D\u306B\u306A\u308A\u307E\u3059\u3002\u304B\u3051\u3089\u304C\u305D\u308D\u3046\u3068\u6607\u683C\uFF08+1\u3001+2\u2026\uFF09\u3067\u304D\u3001\u80FD\u529B\u304C\u4E0A\u304C\u308A\u3001\u30EC\u30D9\u30EB\u306E\u4E0A\u9650\u304C\u4F38\u3073\u307E\u3059\u3002",
        "\u4F53\u529B\u3068\u653B\u6483\u306E\u6570\u5B57\u306F\u3001\u88C5\u5099\u3068\u3001\u76F8\u68D2\u306E\u5E95\u4E0A\u3052\u3092\u542B\u307F\u307E\u3059\u3002",
        "\u88C5\u5099\u306F\u3001\u9762\u306E\u521D\u30AF\u30EA\u30A2\u3068\u3001\u7BB1\uFF082\u6642\u9593\u306B1\u3064\uFF09\u3067\u624B\u306B\u5165\u308A\u307E\u3059\u3002\u5F37\u5316\u306F\u3001\u4ED8\u3051\u66FF\u3048\u3066\u3082\u6B8B\u308A\u307E\u3059\u3002\u4ED8\u3051\u66FF\u3048\u306F\u3001\u305F\u3060\u3067\u3059\u3002",
        "\u300C\u304A\u307E\u304B\u305B\u88C5\u5099\u300D\u306F\u3001\u3060\u308C\u3082\u4ED8\u3051\u3066\u3044\u306A\u3044\u88C5\u5099\u306E\u4E2D\u304B\u3089\u3001\u5834\u6240\u3054\u3068\u306B\u3044\u3061\u3070\u3093\u826F\u3044\u3082\u306E\u3092\u4ED8\u3051\u307E\u3059\u3002\u300C\u5168\u90E8\u5916\u3059\u300D\u3067\u5916\u3057\u305F\u88C5\u5099\u306F\u3001\u307B\u304B\u306E\u56E3\u54E1\u306B\u4ED8\u3051\u3089\u308C\u307E\u3059\u3002",
        "\u4E00\u89A7\u306E\u8D64\u3044\u5370\u306F\u3001\u6607\u683C\u3067\u304D\u308B\u56E3\u54E1\u3068\u3001\u3082\u3063\u3068\u826F\u3044\u88C5\u5099\u304C\u4F59\u3063\u3066\u3044\u308B\u51FA\u6483\u4E2D\u306E\u56E3\u54E1\u3067\u3059\u3002"
      ];
    }
    if (topic === "party") {
      return [
        "\u6575\u306F\u524D\u5217\u3092\u5148\u306B\u72D9\u3044\u307E\u3059\u3002\u4F53\u529B\u306E\u9AD8\u3044\u56E3\u54E1\u3092\u524D\u5217\u306B\u7F6E\u304F\u3068\u3001\u9577\u304F\u6301\u3061\u307E\u3059\u3002",
        "\u67A0\u3092\u62BC\u3057\u3066\u304B\u3089\u3001\u4E0B\u306E\u4E00\u89A7\u3067\u300C\u3053\u3053\u306B\u5165\u308C\u308B\u300D\u3092\u62BC\u3059\u3068\u5165\u308C\u66FF\u308F\u308A\u307E\u3059\u3002",
        "\u76F8\u68D2\u306E\u67A0\u306B\u5165\u308C\u305F1\u4F53\u306F\u3001\u6226\u95D8\u4E2D\u306B\u6280\u3092\u4F7F\u3044\u307E\u3059\u3002"
      ];
    }
    if (topic === "companions") {
      return [
        "\u5404\u7AE0\u306E\u30DC\u30B9\u3092\u5012\u3059\u3068\u3001\u6539\u5FC3\u3057\u3066\u76F8\u68D2\u306B\u306A\u308A\u307E\u3059\u3002\u6301\u3063\u3066\u3044\u308B\u3060\u3051\u3067\u56E3\u54E1\u5168\u54E1\u304C\u5F37\u304F\u306A\u308A\u3001\u7DE8\u6210\u306B\u5165\u308C\u305F1\u4F53\u306F\u3001\u6226\u95D8\u4E2D\u306B\u6280\u3092\u4F7F\u3044\u307E\u3059\u3002",
        `\u5C02\u7528\u306E\u7D20\u6750\u306F\u3001\u7BB1\u306B1\u6642\u9593\u3042\u305F\u308A ${p.companion.matPerHour}\u3053 \u8CAF\u307E\u308B\u307B\u304B\u3001\u521D\u30AF\u30EA\u30A2\u5831\u916C\u3001\u30DF\u30C3\u30B7\u30E7\u30F3\u3001\u65E5\u8AB2\u3067\u3082\u624B\u306B\u5165\u308A\u307E\u3059\u3002`
      ];
    }
    if (topic === "dungeon") {
      return [
        "\u6311\u6226\u306F\u4F55\u56DE\u3067\u3082\u3067\u304D\u307E\u3059\u3002\u5831\u916C\u304C\u51FA\u308B\u306E\u306F\u3001\u305D\u306E\u6BB5\u968E\u3092\u521D\u3081\u3066\u7A81\u7834\u3057\u305F\u3068\u304D\u3060\u3051\u3067\u3059\u3002\u8CA0\u3051\u3066\u3082\u3001\u5931\u3046\u3082\u306E\u306F\u3042\u308A\u307E\u305B\u3093\u3002",
        `\u6E05\u6383: \u7A81\u7834\u3057\u305F\u3044\u3061\u3070\u3093\u4E0A\u306E\u6BB5\u968E\u306E\u5831\u916C\u3092\u3001\u6226\u308F\u305A\u306B\u53D7\u3051\u53D6\u308C\u307E\u3059\u3002\u7A2E\u985E\u3054\u3068\u306B1\u65E5 ${p.dungeon.sweepsPerDay}\u56DE\u307E\u3067\u3002\u65E5\u4ED8\u304C\u5909\u308F\u308B\u3068\u623B\u308A\u307E\u3059\u3002\u6E05\u6383\u306E\u5831\u916C\u306F\u3001\u521D\u56DE\u3088\u308A\u5C11\u306A\u3081\u3067\u3059\u3002`,
        "\u4E0A\u306E\u6BB5\u968E\u307B\u3069\u6575\u304C\u5F37\u304F\u3001\u5831\u916C\u304C\u591A\u304F\u306A\u308A\u307E\u3059\u3002\u7DE8\u6210\u3068\u76F8\u68D2\u306F\u3001\u672C\u7DE8\u3068\u540C\u3058\u3082\u306E\u3092\u4F7F\u3044\u307E\u3059\u3002",
        ...p.dungeon.kinds.map((d) => `${d.name}: ${stageLabel(d.unlockStage, p)} \u3092\u7A81\u7834\u3059\u308B\u3068\u958B\u304D\u307E\u3059\u3002`)
      ];
    }
    if (topic === "recruit") {
      const out = [];
      for (const id of ["premium", "normal"]) {
        const banner = p.recruit.banners[id];
        const rates = recruitRarityRates(ctx2, id).map((r) => `${p.recruit.rarities[r.rarity]?.label ?? r.rarity} ${percent2(r.rate)}`).join("\u30FB");
        const parts = [`${banner.label}: ${rates}\u3002`];
        parts.push(banner.tenGuaranteeStars > 0 ? `10\u9023\u3067\u3001${starsText(banner.tenGuaranteeStars)} \u4EE5\u4E0A\u304C1\u4F53\u304B\u306A\u3089\u305A\u51FA\u307E\u3059\u3002` : "10\u9023\u306E\u78BA\u5B9A\u306F\u3042\u308A\u307E\u305B\u3093\u3002");
        if (banner.pity > 0) parts.push(`${banner.pity}\u56DE\u306E\u3046\u3061\u306B ${starsText(banner.pityStars)} \u304C\u51FA\u306A\u3051\u308C\u3070\u3001${banner.pity}\u56DE\u76EE\u3067\u304B\u306A\u3089\u305A\u51FA\u307E\u3059\u3002`);
        if (!recruitRarityRates(ctx2, id).some((r) => p.recruit.rarities[r.rarity]?.elite)) parts.push("\u30A8\u30EA\u30FC\u30C8\u306F\u51FA\u307E\u305B\u3093\u3002");
        out.push(parts.join(""));
      }
      out.push("\u30C1\u30B1\u30C3\u30C8\u306F\u3001\u30DF\u30C3\u30B7\u30E7\u30F3\u3068\u65E5\u8AB2\u3067\u3082\u3089\u3048\u307E\u3059\u3002");
      out.push("\u3059\u3067\u306B\u3044\u308B\u56E3\u54E1\u304C\u6765\u305F\u3068\u304D\u306F\u3001\u305D\u306E\u56E3\u54E1\u306E\u300C\u304B\u3051\u3089\u300D\u306B\u306A\u308A\u3001\u6607\u683C\uFF08+1\uFF09\u306B\u4F7F\u3048\u307E\u3059\u3002\u65B0\u3057\u3044\u56E3\u54E1\u306F\u3001\u30EC\u30D9\u30EB1\u304B\u3089\u59CB\u307E\u308A\u307E\u3059\u3002");
      out.push("\u4E0B\u306E\u300C\u52E7\u8A98\u300D\u306E\u8D64\u3044\u5370\u306F\u300110\u9023\u3092\u56DE\u305B\u308B\u3060\u3051\u30C1\u30B1\u30C3\u30C8\u304C\u3042\u308B\u3068\u304D\u306B\u4ED8\u304D\u307E\u3059\u3002");
      return out;
    }
    return [
      "\u65E5\u8AB2\u306F\u3001\u65E5\u4ED8\u304C\u5909\u308F\u308B\u3068\u5165\u308C\u66FF\u308F\u308A\u307E\u3059\u3002",
      "\u30DF\u30C3\u30B7\u30E7\u30F3\u306F\u4E00\u5EA6\u304D\u308A\u306E\u76EE\u6A19\u3067\u3059\u3002\u9054\u6210\u3057\u305F\u3089\u3001\u62BC\u3057\u3066\u5831\u916C\u3092\u53D7\u3051\u53D6\u308A\u307E\u3059\u3002\u300C\u307E\u3068\u3081\u3066\u53D7\u3051\u53D6\u308B\u300D\u3067\u3001\u65E5\u8AB2\u3068\u30DF\u30C3\u30B7\u30E7\u30F3\u3092\u307E\u3068\u3081\u3066\u53D7\u3051\u53D6\u308C\u307E\u3059\u3002"
    ];
  }
  function helpHtml(g, ctx2, topic) {
    return `<h2 data-testid="help-title">${HELP_TITLE[topic]}\u306E\u8AAC\u660E</h2><ul class="help-list" data-testid="help-list">${helpNotes(g, ctx2, topic).map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul><button type="button" class="btn btn-wide" data-action="close-modal" data-testid="modal-close">\u9589\u3058\u308B</button>`;
  }
  function plusTenTarget(level, cap) {
    return Math.min(level + 10, cap);
  }
  function heroSelectedId(g, ctx2, hero) {
    if (hero.id !== null && g.members[hero.id]) return hero.id;
    return owned(g, ctx2)[0]?.def.id ?? null;
  }
  function passesFilter(m, filter) {
    if (filter === "all") return true;
    if (filter === "elite") return m.elite;
    return !m.elite && String(m.stars) === filter;
  }
  function tileHasAction(g, id, ctx2) {
    if (promoteInfo(g, id, ctx2).ok) return true;
    return g.party.includes(id) && canAutoEquip(g, id, ctx2);
  }
  function heroCardHtml(g, ctx2, id, hero) {
    const p = ctx2.params;
    const def = ctx2.byId[id];
    const own = g.members[id];
    const s = battleStats(g, id, ctx2);
    if (!def || !own || !s) return "";
    const r = p.recruit.rarities[def.rarity];
    const stars = r?.stars ?? 0;
    const inParty = g.party.includes(id);
    const cap = levelCap(def, own.plus, p);
    const boost = passiveMult(g, ctx2);
    const boosted = boost.hp > 1 || boost.atk > 1;
    const top = `<div class="hero-top"><div class="portrait rar-frame-${stars}${r?.elite ? " is-elite" : ""}" data-testid="hero-portrait">` + (artUrl(id) !== null ? `<img class="portrait-img" src="${artUrl(id)}" alt="" draggable="false">` : `<span class="portrait-char">${escapeHtml(def.name.slice(0, 1))}</span>`) + `<span class="portrait-stars">${starsText(stars)}${r?.elite ? "<i>\u30A8\u30EA\u30FC\u30C8</i>" : ""}</span></div><div class="hero-info"><h2 class="hero-name" data-testid="detail-title">${nameHtml(def, own.plus, ctx2)}</h2><p class="member-sub">${tags(def)}${inParty ? `<span class="tag tag-in">\u51FA\u6483\u4E2D</span>` : ""}</p><div class="hero-power"><small>\u6226\u529B</small> <b data-testid="hero-power">${formatNumber(memberPowerNow(g, id, ctx2))}</b><span class="hero-gold"><small>\u304A\u3072\u306D\u308A</small> <b data-testid="members-gold">${formatNumber(g.gold)}</b></span></div><div class="hero-stats"><span>Lv <b data-testid="detail-level">${own.level}</b>/${cap}</span><span>\u4F53\u529B <b data-testid="detail-hp">${formatNumber(s.hp)}</b></span><span>\u653B\u6483 <b data-testid="detail-atk">${formatNumber(s.atk)}</b></span><span>\u9593\u9694 ${def.interval}\u79D2</span></div>` + (hero.view !== "train" ? "" : `<p class="hero-skill"><b>\u6280</b> ${escapeHtml(skillText(def.skill, p.battle.rallySec))}${def.trait ? ` <b>${TRAIT_LABEL[def.trait]}</b> ${TRAIT_TEXT[def.trait]}` : ""}</p>`) + `</div></div>`;
    const seg = (v, label) => `<button type="button" class="seg-btn ${hero.view === v ? "active" : ""}" data-action="hero-view" data-v="${v}" data-testid="hero-tab-${v}">${label}</button>`;
    const segs = `<div class="seg">${seg("train", "\u80B2\u6210")}${seg("equip", "\u88C5\u5099")}</div>`;
    let body;
    if (hero.view === "train") {
      const capped = own.level >= cap;
      const one = levelPlan(g, id, own.level + 1, ctx2);
      const tenTarget = plusTenTarget(own.level, cap);
      const ten = levelPlan(g, id, tenTarget, ctx2);
      const lv = (label, n, testid, plan, primary) => `<button type="button" class="btn lv-btn ${plan.ok && primary ? "btn-primary" : ""}" data-action="levelup" data-id="${id}" data-n="${n}" data-testid="${testid}-${id}" ${plan.ok ? "" : "disabled"}><span>${label}</span><small>${capped ? "\u4E0A\u9650" : formatNumber(plan.cost)}</small></button>`;
      const promo = promoteInfo(g, id, ctx2);
      const atMax = own.plus >= maxPlus(p);
      const reset = resetInfo(g, id, ctx2);
      const resetButton = hero.resetArmed ? `<button type="button" class="btn btn-danger" data-action="reset-confirm" data-id="${id}" data-testid="reset-confirm">\u3082\u3046\u4E00\u5EA6\u62BC\u3059\u3068 Lv1 \u306B</button>` : `<button type="button" class="btn" data-action="reset" data-id="${id}" data-testid="reset-button" ${reset.ok ? "" : "disabled"}>\u30EA\u30BB\u30C3\u30C8${reset.ok ? `\uFF08+${formatNumber(reset.refund)}\uFF09` : ""}</button>`;
      body = `<div class="hero-lv">` + lv("+1", "1", "levelup", one, true) + lv(capped ? "+10" : `+${tenTarget - own.level}`, "10", "levelten", ten, false) + `<button type="button" class="btn lv-btn" data-action="level-open" data-id="${id}" data-testid="levelset-${id}" ${one.ok ? "" : "disabled"}><span>\u6307\u5B9A</span><small>\u30EC\u30D9\u30EB</small></button></div><div class="hero-row">` + (atMax ? `<span class="mini">\u6607\u683C\u306F\u4E0A\u9650</span>` : `<span class="shards">\u304B\u3051\u3089 <b data-testid="detail-shards">${own.shards}</b>/${promo.need}</span><button type="button" class="btn ${promo.ok ? "btn-primary" : ""}" data-action="promote" data-id="${id}" data-testid="promote-button" ${promo.ok ? "" : "disabled"}>\u6607\u683C\uFF08+${own.plus + 1}\uFF09</button>`) + resetButton + `</div>`;
    } else {
      const on = equippedOn(g, id, ctx2);
      const worn = EQUIP_SLOTS.filter((slot) => on[slot] !== null).length;
      const canAuto = canAutoEquip(g, id, ctx2);
      body = `<div class="eq-grid">${EQUIP_SLOTS.map((slot) => equipTileHtml(g, ctx2, slot, on[slot])).join("")}</div><div class="hero-row hero-row-btns"><button type="button" class="btn ${canAuto ? "btn-primary" : ""}" data-action="auto-equip" data-id="${id}" data-testid="auto-equip" ${canAuto ? "" : "disabled"}>\u304A\u307E\u304B\u305B\u88C5\u5099</button><button type="button" class="btn" data-action="unequip-all" data-id="${id}" data-testid="unequip-all" ${worn > 0 ? "" : "disabled"}>\u5168\u90E8\u5916\u3059</button></div>`;
    }
    return `<section class="hero-card" data-testid="hero-card">${top}${segs}<div class="hero-body">${body}</div></section>`;
  }
  function equipTileHtml(g, ctx2, slot, item) {
    const def = item ? ctx2.equipById[item.defId] : void 0;
    const body = item && def ? `<span class="eq-name rar-${def.stars}">${escapeHtml(equipName(def, item.level))}</span><small>${equipEffectText(def, item.level, ctx2.params)}</small>` : `<span class="eq-name empty">\u306A\u3057</span><small>\u62BC\u3057\u3066\u9078\u3076</small>`;
    let enhance = `<button type="button" class="btn eq-up" disabled data-testid="enhance-${slot}">\u5F37\u5316</button>`;
    if (item && def) {
      const info = enhanceInfo(g, item.uid, ctx2);
      const capped = item.level >= equipLevelCap(def, ctx2.params);
      enhance = `<button type="button" class="btn eq-up ${info.ok ? "btn-primary" : ""}" data-action="enhance" data-uid="${item.uid}" data-testid="enhance-${slot}" ${info.ok ? "" : "disabled"}>\u5F37\u5316 <small>${capped ? "\u4E0A\u9650" : formatNumber(info.gold)}</small></button>`;
    }
    return `<div class="eq-tile" data-testid="eq-${slot}"><button type="button" class="eq-main" data-action="slot-open" data-slot="${slot}" data-testid="slot-open-${slot}"><span class="eq-slot">${SLOT_LABEL[slot]}</span>${body}</button>` + enhance + `</div>`;
  }
  var FILTERS = [
    { v: "all", label: "\u5168\u54E1" },
    { v: "1", label: "\u26051" },
    { v: "2", label: "\u26052" },
    { v: "3", label: "\u26053" },
    { v: "elite", label: "\u30A8\u30EA\u30FC\u30C8" }
  ];
  function membersHtml(g, ctx2, hero) {
    const selected = heroSelectedId(g, ctx2, hero);
    let rows = owned(g, ctx2).filter((m) => passesFilter(m, hero.filter));
    if (hero.sort === "level") rows = rows.slice().sort((a, b) => b.level - a.level || b.stars - a.stars);
    const tiles = rows.map((m) => {
      const id = m.def.id;
      const cls = `tile t-r${m.stars}${m.elite ? " is-elite" : ""}${m.inParty ? " in-party" : ""}${id === selected ? " is-selected" : ""}`;
      return `<li data-testid="member-row-${id}"><button type="button" class="${cls}" data-action="select" data-id="${id}" data-testid="detail-${id}">` + (artUrl(id) !== null ? `<img class="tile-img" src="${artUrl(id)}" alt="" draggable="false" loading="lazy">` : "") + `<span class="tile-lv">Lv <b data-testid="member-level-${id}">${m.level}</b></span><span class="tile-name">${escapeHtml(m.def.name)}${m.plus > 0 ? `<i>+${m.plus}</i>` : ""}</span><span class="tile-stars">${starsText(m.stars)}</span>` + (m.inParty ? `<span class="tile-tag">\u51FA\u6483\u4E2D</span>` : "") + (tileHasAction(g, id, ctx2) ? `<span class="dot" data-testid="tile-dot-${id}"></span>` : "") + `</button></li>`;
    });
    const filterLabel = FILTERS.find((f) => f.v === hero.filter)?.label ?? "\u5168\u54E1";
    const state = `${filterLabel}\u30FB${hero.sort === "level" ? "\u30EC\u30D9\u30EB\u9806" : "\u30EC\u30A2\u5EA6\u9806"}`;
    return (selected === null ? "" : heroCardHtml(g, ctx2, selected, hero)) + `<section class="hero-list" data-scroll-key="hero-list"><div class="list-head"><b>\u56E3\u54E1 ${ownedCount(g)} / ${ctx2.members.length}</b><span class="list-state" data-testid="list-state">${state}</span><button type="button" class="icon-btn" data-action="list-options" data-testid="list-options" aria-label="\u7D5E\u308A\u8FBC\u307F\u3068\u4E26\u3073\u66FF\u3048">\u21C5</button>` + helpButton("members") + `</div>` + (tiles.length > 0 ? `<ul class="hero-grid">${tiles.join("")}</ul>` : `<p class="mini">\u3053\u306E\u7D5E\u308A\u8FBC\u307F\u306B\u5408\u3046\u56E3\u54E1\u306F\u3001\u307E\u3060\u3044\u307E\u305B\u3093\u3002</p>`) + `</section>`;
  }
  function listOptionsHtml(g, ctx2, hero) {
    const all = owned(g, ctx2);
    const filters = FILTERS.map((f) => {
      const n = all.filter((m) => passesFilter(m, f.v)).length;
      return `<button type="button" class="chip ${hero.filter === f.v ? "active" : ""}" data-action="filter" data-v="${f.v}" data-testid="filter-${f.v}">${f.label} <small>${n}</small></button>`;
    }).join("");
    const sort = (v, label) => `<button type="button" class="chip ${hero.sort === v ? "active" : ""}" data-action="sort" data-v="${v}" data-testid="sort-${v}">${label}</button>`;
    return `<h2 data-testid="list-options-title">\u56E3\u54E1\u306E\u4E00\u89A7\u306E\u8868\u793A</h2><h3>\u2605\u3067\u7D5E\u308A\u8FBC\u3080</h3><div class="chips chips-wrap">${filters}</div><h3>\u4E26\u3073</h3><div class="chips chips-wrap">${sort("rarity", "\u30EC\u30A2\u5EA6\u9806")}${sort("level", "\u30EC\u30D9\u30EB\u9806")}</div><button type="button" class="btn btn-wide" data-action="close-modal" data-testid="modal-close">\u9589\u3058\u308B</button>`;
  }
  function memberModalHtml(g, ctx2, detail) {
    const id = detail.id;
    const def = ctx2.byId[id];
    const own = g.members[id];
    if (!def || !own) return "";
    const p = ctx2.params;
    const cap = levelCap(def, own.plus, p);
    const title = `<h2 data-testid="detail-title">${nameHtml(def, own.plus, ctx2)}</h2>`;
    if (detail.view === "level") {
      const max = maxAffordableLevel(g, id, ctx2);
      const target = Math.max(own.level + 1, Math.min(detail.target, Math.max(max, own.level + 1)));
      const plan = levelPlan(g, id, target, ctx2);
      const step = (d, label) => {
        const next = target + d;
        const ok = next > own.level && next <= max;
        return `<button type="button" class="btn" data-action="level-step" data-d="${d}" data-testid="level-step-${d > 0 ? "p" : "m"}${Math.abs(d)}" ${ok ? "" : "disabled"}>${label}</button>`;
      };
      return title + `<p class="member-sub">\u30EC\u30D9\u30EB\u3092\u6307\u5B9A\uFF08\u3044\u307E Lv ${own.level} \uFF0F \u4E0A\u9650 ${cap}\uFF09</p><div class="level-target">Lv <b data-testid="level-target">${target}</b></div><div class="btn-row level-steps">${step(-10, "\u221210")}${step(-1, "\u22121")}${step(1, "+1")}${step(10, "+10")}</div><button type="button" class="btn btn-wide" data-action="level-max" data-testid="level-max" ${max > own.level && target !== max ? "" : "disabled"}>\u4E0A\u3052\u3089\u308C\u308B\u3068\u3053\u308D\u307E\u3067\uFF08Lv ${Math.max(max, own.level)}\uFF09</button><dl class="stats"><div><dt>\u8981\u308B\u304A\u3072\u306D\u308A</dt><dd data-testid="level-cost">${formatNumber(plan.cost)}</dd></div><div><dt>\u6301\u3063\u3066\u3044\u308B\u304A\u3072\u306D\u308A</dt><dd>${formatNumber(g.gold)}</dd></div></dl>` + (plan.ok ? "" : `<p class="mini">${escapeHtml(plan.reason ?? "")}</p>`) + `<button type="button" class="btn btn-primary btn-wide" data-action="level-confirm" data-testid="level-confirm" ${plan.ok ? "" : "disabled"}>Lv ${target} \u307E\u3067\u4E0A\u3052\u308B</button><button type="button" class="btn btn-wide" data-action="close-modal" data-testid="modal-close">\u623B\u308B</button>`;
    }
    const slot = detail.slot ?? "weapon";
    const items = g.equips.filter((e) => ctx2.equipById[e.defId]?.slot === slot).map((e) => ({ e, def: ctx2.equipById[e.defId] })).sort((a, b) => equipBonus(b.def, b.e.level, p) - equipBonus(a.def, a.e.level, p) || a.e.uid - b.e.uid);
    const rows = items.slice(0, 40).map(({ e, def: d }) => {
      const mine = e.on === id;
      const other = e.on !== null && !mine ? `<small>${escapeHtml(ctx2.byId[e.on]?.name ?? "")} \u304C\u88C5\u5099\u4E2D</small>` : "";
      const button = mine ? `<button type="button" class="btn" data-action="unequip" data-uid="${e.uid}" data-testid="unequip-${e.uid}">\u5916\u3059</button>` : `<button type="button" class="btn btn-primary" data-action="equip" data-uid="${e.uid}" data-testid="equip-${e.uid}">${e.on !== null ? "\u79FB\u3059" : "\u4ED8\u3051\u308B"}</button>`;
      return `<li class="eq-item ${mine ? "is-mine" : ""}"><span class="task-text">${escapeHtml(equipName(d, e.level))}<small>${equipEffectText(d, e.level, p)}${mine ? "\uFF08\u4ED8\u3051\u3066\u3044\u308B\uFF09" : ""}</small>${other}</span>${button}</li>`;
    });
    return title + `<p class="member-sub">${SLOT_LABEL[slot]}\u3092\u9078\u3076\uFF08\u52B9\u679C\u306E\u9AD8\u3044\u9806\uFF09</p>` + (rows.length > 0 ? `<ul class="task-list" data-testid="slot-list">${rows.join("")}</ul>` : `<p class="mini" data-testid="slot-list">\u3053\u306E\u5834\u6240\u306E\u88C5\u5099\u3092\u3001\u307E\u3060\u6301\u3063\u3066\u3044\u307E\u305B\u3093\u3002\u9762\u3092\u521D\u3081\u3066\u7A81\u7834\u3059\u308B\u304B\u3001\u7BB1\u304B\u3089\u624B\u306B\u5165\u308A\u307E\u3059\u3002</p>`) + `<button type="button" class="btn btn-wide" data-action="close-modal" data-testid="modal-close">\u623B\u308B</button>`;
  }
  function partyHtml(g, ctx2, ui) {
    const slot = (i) => {
      const id = g.party[i] ?? null;
      const def = id === null ? void 0 : ctx2.byId[id];
      const own = id === null ? void 0 : g.members[id];
      const selected = ui.selectedSlot === i ? "selected" : "";
      const body = def && own ? `<b>${escapeHtml(def.name)}</b><small>${starsText(ctx2.params.recruit.rarities[def.rarity]?.stars ?? 0)} Lv ${own.level}</small><small>${ROLE_LABEL[def.role]}</small>` : `<b class="empty">\u7A7A\u304D</b><small>\u62BC\u3057\u3066\u9078\u3076</small>`;
      return `<button type="button" class="slot ${selected}" data-action="slot" data-slot="${i}" data-testid="slot-${i}">${body}</button>`;
    };
    const sel = ui.selectedSlot;
    const partyCount = g.party.filter((x) => x !== null).length;
    const canRemove = sel !== null && (g.party[sel] ?? null) !== null && partyCount > 1;
    const guide = sel === null ? "\u2460 \u5165\u308C\u66FF\u3048\u305F\u3044\u67A0\u3092\u62BC\u3057\u3066\u304F\u3060\u3055\u3044\u3002" : `\u2461 ${sel < FRONT_SIZE ? "\u524D\u5217" : "\u5F8C\u5217"}\u306E${sel % FRONT_SIZE + 1}\u756A\u306B\u5165\u308C\u308B\u56E3\u54E1\u3092\u3001\u4E0B\u304B\u3089\u9078\u3093\u3067\u304F\u3060\u3055\u3044\u3002`;
    const rows = owned(g, ctx2).map((m) => {
      const where = g.party.indexOf(m.def.id);
      const place = where >= 0 ? `${where < FRONT_SIZE ? "\u524D\u5217" : "\u5F8C\u5217"}${where % FRONT_SIZE + 1}` : "\u63A7\u3048";
      return `<li class="member ${m.inParty ? "in-party" : ""}"><span class="member-main static"><span class="member-name">${nameHtml(m.def, m.plus, ctx2)}</span><span class="member-sub">${tags(m.def)}<span class="tag ${m.inParty ? "tag-in" : ""}">${place}</span></span><span class="member-sub">Lv ${m.level} \uFF0F \u6226\u529B ${formatNumber(m.power)}</span></span><button type="button" class="btn ${sel !== null ? "btn-primary" : ""}" data-action="place" data-id="${m.def.id}" data-testid="place-${m.def.id}" ${sel === null ? "disabled" : ""}>\u3053\u3053\u306B\u5165\u308C\u308B</button></li>`;
    });
    const companionIds = Object.keys(g.companions);
    const equipped = g.companionSlot === null ? void 0 : ctx2.companionById[g.companionSlot];
    const equippedOwn = g.companionSlot === null ? void 0 : g.companions[g.companionSlot];
    const companionBody = equipped && equippedOwn ? `<b>${escapeHtml(equipped.name)}</b><small>Lv ${equippedOwn.level} \u76F8\u68D2</small>` : companionIds.length > 0 ? `<b class="empty">\u7A7A\u304D</b><small>\u62BC\u3057\u3066\u3001\u76F8\u68D2\u3092\u9078\u3076</small>` : `<b class="empty">\u307E\u3060\u3044\u307E\u305B\u3093</b><small>\u30DC\u30B9\u3092\u5012\u3059\u3068\u76F8\u68D2\u306B\u306A\u308B</small>`;
    const front = Array.from({ length: FRONT_SIZE }, (_, i) => slot(i)).join("");
    const back = Array.from({ length: FRONT_SIZE }, (_, i) => slot(FRONT_SIZE + i)).join("");
    return titleRow(`\u7DE8\u6210\uFF08\u6226\u529B ${formatNumber(partyPower(g, ctx2))}\uFF09`, "party") + `<div class="formation"><div class="formation-row"><span class="row-label">\u524D\u5217</span>${front}</div><div class="formation-row"><span class="row-label">\u5F8C\u5217</span>${back}</div><div class="formation-row"><span class="row-label">\u76F8\u68D2</span><button type="button" class="slot slot-companion" data-action="tab" data-tab="companions" data-testid="slot-companion">${companionBody}</button></div></div><div class="row-between"><span class="guide-text" data-testid="party-guide">${guide}</span><button type="button" class="btn" data-action="remove" data-testid="slot-remove" ${canRemove ? "" : "disabled"}>\u5916\u3059</button></div><ul class="member-list">${rows.join("")}</ul>`;
  }
  function companionRow(g, ctx2, def) {
    const p = ctx2.params;
    const own = g.companions[def.id];
    const bossStage = def.chapter * p.progress.stagesPerChapter;
    if (!own) {
      const reached = g.highestCleared >= (def.chapter - 1) * p.progress.stagesPerChapter;
      return `<li class="comp locked" data-testid="companion-row-${def.id}"><div class="comp-head"><b>${reached ? escapeHtml(def.name) : "\uFF1F\uFF1F\uFF1F"}</b></div><div class="comp-line">${stageLabel(bossStage, p)} \u306E\u30DC\u30B9\u3002\u5012\u3059\u3068\u3001\u76F8\u68D2\u306B\u306A\u308A\u307E\u3059\u3002</div></li>`;
    }
    const info = companionLevelInfo(g, def.id, ctx2);
    const equipped = g.companionSlot === def.id;
    const capped = own.level >= p.companion.levelCap;
    const have = g.materials[def.id] ?? 0;
    const cost = capped ? `<div class="comp-line">\u30EC\u30D9\u30EB\u306F\u4E0A\u9650\u3067\u3059\u3002</div>` : `<div class="comp-line">\u6B21\u306E\u30EC\u30D9\u30EB\u306B\u8981\u308B\u3082\u306E: ${escapeHtml(def.material)} <b data-testid="companion-mats-${def.id}">${have}</b> / ${info.mats} \u3068\u3001\u304A\u3072\u306D\u308A ${formatNumber(info.gold)}</div>`;
    return `<li class="comp ${equipped ? "equipped" : ""}" data-testid="companion-row-${def.id}"><div class="comp-head"><b>${escapeHtml(def.name)}</b><span>Lv <b data-testid="companion-level-${def.id}">${own.level}</b> / ${p.companion.levelCap}</span>${equipped ? `<span class="tag tag-in">\u7DE8\u6210\u4E2D</span>` : ""}</div><div class="comp-line"><b>\u5E95\u4E0A\u3052:</b> ${escapeHtml(passiveText(def, own.level))}\uFF08\u6301\u3063\u3066\u3044\u308B\u3060\u3051\u3067\u304B\u304B\u308B\uFF09</div><div class="comp-line"><b>\u6280:</b> ${escapeHtml(companionSkillText(def, companionSkillPower(def, own.level, p), p.battle.rallySec))}\uFF08\u7DE8\u6210\u306B\u5165\u308C\u308B\u3068\u4F7F\u3046\uFF09</div>` + cost + `<div class="btn-row"><button type="button" class="btn ${info.ok ? "btn-primary" : ""}" data-action="companion-levelup" data-id="${def.id}" data-testid="companion-levelup-${def.id}" ${info.ok ? "" : "disabled"}>\u30EC\u30D9\u30EB\u3092\u4E0A\u3052\u308B</button>` + (equipped ? `<button type="button" class="btn" data-action="companion-unequip" data-testid="companion-unequip-${def.id}">\u7DE8\u6210\u304B\u3089\u5916\u3059</button>` : `<button type="button" class="btn btn-primary" data-action="companion-equip" data-id="${def.id}" data-testid="companion-equip-${def.id}">\u7DE8\u6210\u306B\u5165\u308C\u308B</button>`) + `</div>` + (!info.ok && !capped && info.reason ? `<div class="mini">${escapeHtml(info.reason)}</div>` : "") + `</li>`;
  }
  function companionsHtml(g, ctx2) {
    const p = ctx2.params;
    const list = ctx2.companions.slice().sort((a, b) => a.chapter - b.chapter);
    const boost = passiveMult(g, ctx2);
    const total = [];
    if (boost.hp > 1) total.push(`\u4F53\u529B +${Math.round((boost.hp - 1) * 100)}%`);
    if (boost.atk > 1) total.push(`\u653B\u6483 +${Math.round((boost.atk - 1) * 100)}%`);
    return titleRow(`\u76F8\u68D2\uFF08${Object.keys(g.companions).length} / ${list.length}\u4F53\uFF09`, "companions") + `<div class="mini" data-testid="companion-total">\u3044\u307E\u306E\u5E95\u4E0A\u3052\u306E\u5408\u8A08: ${total.length > 0 ? `\u56E3\u54E1\u5168\u54E1\u306E ${total.join("\u3001")}` : "\u306A\u3057"}</div><ul class="comp-list">${list.map((def) => companionRow(g, ctx2, def)).join("")}</ul>`;
  }
  function percent2(rate) {
    return `${Math.round(rate * 1e3) / 10}%`;
  }
  function bannerHtml(g, ctx2, bannerId) {
    const p = ctx2.params;
    const banner = p.recruit.banners[bannerId];
    const premium = bannerId === "premium";
    const have = premium ? g.premiumTickets : g.tickets;
    const left = pityLeft(g, bannerId, ctx2);
    const pity = left !== null ? `<div class="pity">${starsText(banner.pityStars)} \u78BA\u5B9A\u307E\u3067 \u3042\u3068 <b data-testid="pity-left">${left}</b>\u56DE</div>` : "";
    let first = "";
    if (premium && !g.recruit.firstTenDone && p.recruit.firstPremiumTen.length > 0) {
      const names = p.recruit.firstPremiumTen.map((id) => {
        const def = ctx2.byId[id];
        return def ? `${ROLE_LABEL[def.role]}\u306E ${escapeHtml(def.name)}\uFF08${rarityText(def, p)}\uFF09` : "";
      });
      first = `<p class="first-ten" data-testid="first-ten-note">\u6700\u521D\u306E10\u9023\u3067\u306F\u3001${names.join(" \u3068\u3001")} \u304C\u5FC5\u305A\u6765\u307E\u3059\u3002</p>`;
    }
    return `<div class="recruit-box ${premium ? "recruit-premium" : ""}" data-testid="banner-${bannerId}"><h3>${escapeHtml(banner.label)}</h3><div>${premium ? "\u9AD8\u7D1A" : "\u901A\u5E38"}\u30C1\u30B1\u30C3\u30C8 <b data-testid="${premium ? "premium-tickets" : "recruit-tickets"}">${have}</b> \u679A</div>` + first + `<div class="btn-row recruit-btns"><button type="button" class="btn ${have >= 1 ? "btn-primary" : ""} btn-big" data-action="recruit" data-banner="${bannerId}" data-count="1" data-testid="recruit-${bannerId}-1" ${have >= 1 ? "" : "disabled"}>1\u56DE<small>1\u679A</small></button><button type="button" class="btn ${have >= 10 ? "btn-primary" : ""} btn-big" data-action="recruit" data-banner="${bannerId}" data-count="10" data-testid="recruit-${bannerId}-10" ${have >= 10 ? "" : "disabled"}>10\u9023<small>10\u679A</small></button></div>` + pity + `<button type="button" class="btn" data-action="rates" data-banner="${bannerId}" data-testid="rates-${bannerId}">\u51FA\u308B\u56E3\u54E1\u3068\u5272\u5408\u3092\u898B\u308B</button></div>`;
  }
  function recruitHtml(g, ctx2) {
    return titleRow("\u52E7\u8A98", "recruit") + bannerHtml(g, ctx2, "premium") + bannerHtml(g, ctx2, "normal");
  }
  function ratesHtml(g, ctx2, bannerId) {
    const p = ctx2.params;
    const banner = p.recruit.banners[bannerId];
    const per = recruitRates(ctx2, bannerId);
    const groups = recruitRarityRates(ctx2, bannerId).slice().sort((a, b) => {
      const ra = p.recruit.rarities[a.rarity];
      const rb = p.recruit.rarities[b.rarity];
      return (rb?.stars ?? 0) - (ra?.stars ?? 0) || Number(rb?.elite ?? false) - Number(ra?.elite ?? false);
    }).map((group) => {
      const rows = ctx2.members.filter((m) => m.rarity === group.rarity).map((m) => {
        const own = g.members[m.id];
        const rate = per.find((x) => x.id === m.id)?.rate ?? 0;
        return `<li><span>${escapeHtml(m.name)} <small>${ROLE_LABEL[m.role]}${own ? `\u30FB\u5728\u7C4D${own.plus > 0 ? ` +${own.plus}` : ""}` : ""}</small></span><span>${(rate * 100).toFixed(2)}%</span></li>`;
      });
      return `<h3>${escapeHtml(p.recruit.rarities[group.rarity]?.label ?? group.rarity)}\uFF08\u5408\u308F\u305B\u3066 ${percent2(group.rate)}\uFF09</h3><ul class="rates">${rows.join("")}</ul>`;
    });
    return `<h2 data-testid="rates-title">${escapeHtml(banner.label)}\u304B\u3089\u51FA\u308B\u56E3\u54E1</h2>` + groups.join("") + `<button type="button" class="btn btn-wide" data-action="close-modal" data-testid="modal-close">\u9589\u3058\u308B</button>`;
  }
  function goalRow(view, kind) {
    const id = view.def.id;
    const side = view.claimed ? `<span class="goal-done">\u53D7\u3051\u53D6\u308A\u6E08\u307F</span>` : view.claimable ? `<button type="button" class="btn btn-primary" data-action="claim-${kind}" data-id="${id}" data-testid="claim-${id}">\u53D7\u3051\u53D6\u308B</button>` : `<span class="goal-progress">${view.progress} / ${view.def.target}</span>`;
    return `<li class="task ${view.claimed ? "task-done" : view.claimable ? "task-ready" : ""}" data-testid="${kind}-${id}"><span class="task-text">${escapeHtml(view.def.text)}<small>\u5831\u916C: ${escapeHtml(rewardText(view.reward))}</small></span>` + side + `</li>`;
  }
  var PENDING_SHOWN = 8;
  function missionsHtml(g, ctx2) {
    const dailies = dailyList(g, ctx2);
    const missions = missionList(g, ctx2);
    const ready = missions.filter((m) => m.claimable);
    const pending = missions.filter((m) => !m.claimable && !m.claimed);
    const claimed = missions.filter((m) => m.claimed).length;
    const readyCount = ready.length + dailies.filter((d) => d.claimable).length;
    const rest = pending.length - PENDING_SHOWN;
    return titleRow(
      "\u4ECA\u65E5\u306E\u65E5\u8AB2",
      "missions",
      `<button type="button" class="btn ${readyCount > 0 ? "btn-primary" : ""}" data-action="claim-all" data-testid="claim-all" ${readyCount > 0 ? "" : "disabled"}>\u307E\u3068\u3081\u3066\u53D7\u3051\u53D6\u308B${readyCount > 0 ? `\uFF08${readyCount}\uFF09` : ""}</button>`
    ) + `<ul class="task-list" data-testid="daily-list">${dailies.map((d) => goalRow(d, "daily")).join("")}</ul><h2 class="panel-title">\u30DF\u30C3\u30B7\u30E7\u30F3\uFF08${claimed} / ${missions.length}\uFF09</h2><ul class="task-list" data-testid="mission-list">` + ready.map((m) => goalRow(m, "mission")).join("") + pending.slice(0, PENDING_SHOWN).map((m) => goalRow(m, "mission")).join("") + `</ul>` + (rest > 0 ? `<p class="mini">\u3053\u306E\u307B\u304B\u306B\u3001${rest}\u4EF6\u306E\u30DF\u30C3\u30B7\u30E7\u30F3\u304C\u3042\u308A\u307E\u3059\u3002</p>` : "") + (pending.length === 0 && ready.length === 0 ? `<p class="mini">\u3059\u3079\u3066\u306E\u30DF\u30C3\u30B7\u30E7\u30F3\u3092\u9054\u6210\u3057\u307E\u3057\u305F\u3002</p>` : "");
  }
  function otherHtml(g, ctx2, ui, extraHtml = "") {
    const p = ctx2.params;
    const chapters = [];
    for (let ch = 1; ch <= p.progress.chapters; ch++) {
      const first = (ch - 1) * p.progress.stagesPerChapter;
      const done = Math.max(0, Math.min(p.progress.stagesPerChapter, g.highestCleared - first));
      const boss = ctx2.companions.find((c) => c.chapter === ch);
      const open = g.highestCleared >= first;
      const state = boss && g.companions[boss.id] ? "\u76F8\u68D2\u306B\u306A\u3063\u305F" : open ? "\u307E\u3060\u5012\u3057\u3066\u3044\u306A\u3044" : "\uFF1F\uFF1F\uFF1F";
      chapters.push(
        `<li class="${open ? "" : "locked"}"><span>\u7B2C${ch}\u7AE0 <small>${open ? `${done} / ${p.progress.stagesPerChapter}\u9762` : "\u307E\u3060\u884C\u3051\u307E\u305B\u3093"}</small></span><span>\u30DC\u30B9: ${open && boss ? escapeHtml(boss.name) : "\uFF1F\uFF1F\uFF1F"} <small>${state}</small></span></li>`
      );
    }
    const a2hs = ui.standalone ? "" : `<div class="card guide" data-testid="a2hs-guide"><h3>\u30DB\u30FC\u30E0\u753B\u9762\u306B\u8FFD\u52A0\u3057\u3066\u304F\u3060\u3055\u3044</h3><p>Safari\u306E\u5171\u6709\u30DC\u30BF\u30F3\uFF08\u56DB\u89D2\u304B\u3089\u77E2\u5370\u304C\u51FA\u3066\u3044\u308B\u30DC\u30BF\u30F3\uFF09\u3092\u62BC\u3057\u3001\u300C\u30DB\u30FC\u30E0\u753B\u9762\u306B\u8FFD\u52A0\u300D\u3092\u9078\u3073\u307E\u3059\u3002\u8FFD\u52A0\u3057\u305F\u30A2\u30A4\u30B3\u30F3\u304B\u3089\u958B\u304F\u3068\u3001\u30BB\u30FC\u30D6\u304C\u6D88\u3048\u306B\u304F\u304F\u306A\u308A\u307E\u3059\u3002</p></div>`;
    return `<h2 class="panel-title">\u65C5\u306E\u8A18\u9332</h2><ul class="chapters" data-testid="chapters">${chapters.join("")}</ul><div class="mini">${allCleared(g, ctx2) ? "\u3059\u3079\u3066\u306E\u9762\u3092\u7A81\u7834\u3057\u307E\u3057\u305F\u3002" : ""}\u7BB1\u306B\u8CAF\u307E\u308B\u304A\u3072\u306D\u308A: 1\u5206\u3042\u305F\u308A ${formatNumber(idleGoldPerMin(g.highestCleared, p))}\uFF08\u4E0A\u9650 ${p.economy.idleCapHours}\u6642\u9593\u3076\u3093\uFF09</div>` + a2hs + `<h2 class="panel-title">\u8A2D\u5B9A</h2><dl class="stats"><div><dt>\u30D3\u30EB\u30C9</dt><dd data-testid="build-id">${escapeHtml(ui.buildId)}</dd></div><div><dt>\u4FDD\u5B58</dt><dd data-testid="save-status">${escapeHtml(ui.saveStatus)}</dd></div><div><dt>\u958B\u304D\u65B9</dt><dd data-testid="launch-mode">${ui.standalone ? "\u30DB\u30FC\u30E0\u753B\u9762\u304B\u3089" : "\u30D6\u30E9\u30A6\u30B6\u304B\u3089"}</dd></div></dl><div class="row-between"><span>\u52B9\u679C\u97F3</span><button type="button" class="btn ${ui.sound === false ? "" : "btn-primary"}" data-action="sound-toggle" data-testid="sound-toggle">${ui.sound === false ? "\u5207\uFF08\u62BC\u3059\u3068\u5165\uFF09" : "\u5165\uFF08\u62BC\u3059\u3068\u5207\uFF09"}</button></div><div class="card"><h3>\u30BB\u30FC\u30D6\u306E\u66F8\u304D\u51FA\u3057\u3068\u8AAD\u307F\u8FBC\u307F</h3><p class="mini">\u6A5F\u7A2E\u3092\u5909\u3048\u308B\u3068\u304D\u3084\u3001\u5FF5\u306E\u305F\u3081\u306E\u63A7\u3048\u306B\u4F7F\u3044\u307E\u3059\u3002\u66F8\u304D\u51FA\u3057\u305F\u6587\u5B57\u3092\u3069\u3053\u304B\u306B\u8CBC\u3063\u3066\u53D6\u3063\u3066\u304A\u304D\u3001\u8AAD\u307F\u8FBC\u3080\u3068\u304D\u306F\u3053\u3053\u306B\u8CBC\u308A\u4ED8\u3051\u307E\u3059\u3002</p><div class="btn-row"><button type="button" class="btn" data-action="export" data-testid="export-button">\u66F8\u304D\u51FA\u3059</button><button type="button" class="btn" data-action="copy-export" data-testid="export-copy" ${ui.exportText === "" ? "disabled" : ""}>\u30B3\u30D4\u30FC</button></div><textarea class="save-area" readonly data-testid="export-area" placeholder="\u300C\u66F8\u304D\u51FA\u3059\u300D\u3092\u62BC\u3059\u3068\u3001\u3053\u3053\u306B\u30BB\u30FC\u30D6\u304C\u51FA\u307E\u3059">${escapeHtml(ui.exportText)}</textarea><textarea class="save-area" data-testid="import-area" placeholder="\u8AAD\u307F\u8FBC\u3080\u30BB\u30FC\u30D6\u3092\u3001\u3053\u3053\u306B\u8CBC\u308A\u4ED8\u3051\u307E\u3059"></textarea><div class="btn-row"><button type="button" class="btn" data-action="import" data-testid="import-button">\u8AAD\u307F\u8FBC\u3080</button><span class="mini" data-testid="import-message">${escapeHtml(ui.importMessage)}</span></div></div>` + extraHtml;
  }
  function recruitResultHtml(g, ctx2, outcomes) {
    const p = ctx2.params;
    const rows = outcomes.map((o) => {
      const def = ctx2.byId[o.id];
      if (!def) return "";
      const r = p.recruit.rarities[def.rarity];
      return `<li class="${o.duplicate ? "" : "is-new"} rar-row-${r?.stars ?? 0}${r?.elite ? " rar-row-elite" : ""}"><span>${artUrl(def.id) !== null ? `<img class="row-img" src="${artUrl(def.id)}" alt="" draggable="false">` : ""}${escapeHtml(def.name)} <small class="rar rar-${r?.stars ?? 0}${r?.elite ? " rar-elite" : ""}">${rarityText(def, p)}</small> <small>${ROLE_LABEL[def.role]}</small></span><span>${o.duplicate ? "\u304B\u3051\u3089 +1" : "\u65B0\u3057\u3044\u56E3\u54E1\uFF01"}</span></li>`;
    });
    const fresh = outcomes.filter((o) => !o.duplicate).length;
    const canFill = g.party.includes(null) && ownedCount(g) > g.party.filter((x) => x !== null).length;
    return `<h2 data-testid="recruit-result">\u52E7\u8A98\u306E\u7D50\u679C\uFF08${outcomes.length}\u56DE\u3001\u65B0\u3057\u3044\u56E3\u54E1 ${fresh}\u4EBA\uFF09</h2><ul class="rates" data-testid="recruit-result-list">${rows.join("")}</ul>` + (canFill ? `<button type="button" class="btn btn-primary btn-wide" data-action="fill-empty" data-testid="fill-empty">\u7DE8\u6210\u306E\u7A7A\u304D\u306B\u5165\u308C\u308B\uFF08\u30EC\u30A2\u5EA6\u306E\u9AD8\u3044\u9806\uFF09</button>` : "") + `<button type="button" class="btn btn-wide" data-action="close-modal" data-testid="modal-close">\u9589\u3058\u308B</button>`;
  }
  function companionJoinHtml(g, ctx2, id) {
    const def = ctx2.companionById[id];
    const own = g.companions[id];
    if (!def) return "";
    const p = ctx2.params;
    const level = own?.level ?? 1;
    const equip = g.companionSlot === id ? `<p class="mini">\u7DE8\u6210\u306B\u5165\u3063\u3066\u3044\u307E\u3059\u3002\u6B21\u306E\u6226\u95D8\u304B\u3089\u3001\u6280\u3092\u4F7F\u3044\u307E\u3059\u3002</p>` : `<button type="button" class="btn btn-primary btn-wide" data-action="equip-close" data-id="${id}" data-testid="equip-companion">\u7DE8\u6210\u306B\u5165\u308C\u308B</button>`;
    return `<h2 data-testid="companion-result">\u30DC\u30B9\u304C\u76F8\u68D2\u306B\uFF01</h2><p><b>${escapeHtml(def.name)}</b> \u304C\u6539\u5FC3\u3057\u3066\u3001\u5287\u56E3\u306E\u76F8\u68D2\u306B\u306A\u308A\u307E\u3057\u305F\u3002</p><p class="comp-line"><b>\u5E95\u4E0A\u3052:</b> ${escapeHtml(passiveText(def, level))}\uFF08\u6301\u3063\u3066\u3044\u308B\u3060\u3051\u3067\u304B\u304B\u308B\uFF09</p><p class="comp-line"><b>\u6280:</b> ${escapeHtml(companionSkillText(def, companionSkillPower(def, level, p), p.battle.rallySec))}\uFF08\u7DE8\u6210\u306B\u5165\u308C\u308B\u3068\u4F7F\u3046\uFF09</p><p class="mini">\u300C${escapeHtml(def.material)}\u300D\u3068\u304A\u3072\u306D\u308A\u3067\u3001\u30EC\u30D9\u30EB\u3092\u4E0A\u3052\u3089\u308C\u307E\u3059\u3002${escapeHtml(def.material)}\u306F\u3001\u7BB1\u306B\u5C11\u3057\u305A\u3064\u8CAF\u307E\u308A\u307E\u3059\u3002</p>` + equip + `<button type="button" class="btn btn-wide" data-action="close-modal" data-testid="modal-close">\u9589\u3058\u308B</button>`;
  }

  // src/debug/debug.ts
  var MAX_ENTRIES = 200;
  var events = [];
  var errors = [];
  var options = null;
  function logEvent(type, data = {}) {
    push(events, { atMs: Date.now(), type, data });
  }
  function installDebug(opts) {
    options = opts;
    window.addEventListener("error", (e) => {
      recordError("error", e.message, e.error instanceof Error ? e.error.stack : void 0, `${e.filename}:${e.lineno}:${e.colno}`);
    });
    window.addEventListener("unhandledrejection", (e) => {
      const reason = e.reason;
      recordError("promise", reason instanceof Error ? reason.message : String(reason), reason instanceof Error ? reason.stack : void 0);
    });
    const fab = document.createElement("button");
    fab.type = "button";
    fab.className = opts.mount ? "dbg-chip" : "dbg-fab";
    fab.dataset["testid"] = "debug-log-button";
    fab.textContent = "\u30ED\u30B0";
    fab.addEventListener("click", openSheet);
    (opts.mount ?? document.body).appendChild(fab);
  }
  function openLogSheet() {
    openSheet();
  }
  function buildReport() {
    const lines = [];
    const nav = navigator;
    lines.push("=== \u653E\u7F6E\u30B2\u30FC\u30E0 \u30ED\u30B0 ===");
    lines.push(`\u30D3\u30EB\u30C9: ${options?.buildId ?? "\u4E0D\u660E"}`);
    lines.push(`\u66F8\u304D\u51FA\u3057\u305F\u6642\u523B: ${(/* @__PURE__ */ new Date()).toISOString()}`);
    lines.push(`URL: ${location.href}`);
    lines.push(`\u7AEF\u672B: ${navigator.userAgent}`);
    lines.push(`\u753B\u9762: ${window.innerWidth}x${window.innerHeight} (\u500D\u7387 ${window.devicePixelRatio})`);
    lines.push(`\u30DB\u30FC\u30E0\u753B\u9762\u304B\u3089\u8D77\u52D5: ${nav.standalone === true ? "\u306F\u3044" : "\u3044\u3044\u3048"}`);
    lines.push("");
    lines.push("--- \u30D7\u30EC\u30A4\u306E\u8A18\u9332 ---");
    try {
      for (const l of options?.getPlayLines?.() ?? []) lines.push(l);
    } catch (e) {
      lines.push(`\uFF08\u8A18\u9332\u3092\u4F5C\u308C\u307E\u305B\u3093\u3067\u3057\u305F: ${String(e)}\uFF09`);
    }
    lines.push("");
    lines.push(`--- \u30A8\u30E9\u30FC (${errors.length}\u4EF6) ---`);
    for (const e of errors) lines.push(formatEntry(e));
    lines.push("");
    lines.push(`--- \u51FA\u6765\u4E8B (${events.length}\u4EF6) ---`);
    for (const e of events) lines.push(formatEntry(e));
    lines.push("");
    lines.push("--- \u30BB\u30FC\u30D6 ---");
    lines.push(options?.getSaveText() ?? "");
    return lines.join("\n");
  }
  function recordError(kind, message, stack, where) {
    push(errors, { atMs: Date.now(), type: kind, data: { message, where: where ?? "", stack: stack ?? "" } });
    showBand();
  }
  function push(list, entry) {
    list.push(entry);
    if (list.length > MAX_ENTRIES) list.shift();
  }
  function formatEntry(e) {
    return `${new Date(e.atMs).toISOString()} [${e.type}] ${JSON.stringify(e.data)}`;
  }
  function showBand() {
    let band = document.querySelector(".dbg-band");
    if (!band) {
      band = document.createElement("div");
      band.className = "dbg-band";
      band.dataset["testid"] = "debug-error-band";
      const label2 = document.createElement("span");
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "\u30ED\u30B0\u3092\u66F8\u304D\u51FA\u3059";
      button.addEventListener("click", openSheet);
      band.append(label2, button);
      document.body.appendChild(band);
    }
    const label = band.querySelector("span");
    if (label) label.textContent = `\u30A8\u30E9\u30FC\u304C\u8D77\u304D\u307E\u3057\u305F\uFF08${errors.length}\u4EF6\uFF09`;
  }
  function openSheet() {
    if (document.querySelector(".dbg-sheet")) return;
    const report = buildReport();
    const fileName = `idle-game-log-${options?.buildId ?? "dev"}-${Date.now()}.txt`;
    const sheet = document.createElement("div");
    sheet.className = "dbg-sheet";
    sheet.dataset["testid"] = "debug-sheet";
    const panel = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = "\u30ED\u30B0";
    const hint = document.createElement("span");
    hint.textContent = "\u300C\u30B3\u30D4\u30FC\u300D\u3092\u62BC\u3057\u3001iPhone\u306EClaude\u3067\u3044\u3064\u3082\u306E\u4F1A\u8A71\u3092\u958B\u3044\u3066\u3001\u8CBC\u308A\u4ED8\u3051\u3066\u9001\u3063\u3066\u304F\u3060\u3055\u3044\u3002";
    hint.style.fontSize = "13px";
    const area = document.createElement("textarea");
    area.readOnly = true;
    area.value = report;
    area.dataset["testid"] = "debug-report";
    const row = document.createElement("div");
    row.className = "row";
    const shareBtn = makeButton("\u30D5\u30A1\u30A4\u30EB\u3067\u9001\u308B", async () => {
      const file = new File([report], fileName, { type: "text/plain" });
      try {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: fileName });
          return;
        }
      } catch {
      }
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1e4);
    });
    const copyBtn = makeButton("\u30B3\u30D4\u30FC", async () => {
      try {
        await navigator.clipboard.writeText(report);
        copyBtn.textContent = "\u30B3\u30D4\u30FC\u3057\u307E\u3057\u305F";
      } catch {
        area.focus();
        area.select();
        copyBtn.textContent = "\u9078\u629E\u3057\u307E\u3057\u305F\u3002\u9577\u62BC\u3057\u3067\u30B3\u30D4\u30FC";
      }
    });
    const closeBtn = makeButton("\u9589\u3058\u308B", () => sheet.remove());
    closeBtn.classList.add("ghost");
    row.append(shareBtn, copyBtn, closeBtn);
    panel.append(title, hint, area, row);
    sheet.appendChild(panel);
    document.body.appendChild(sheet);
  }
  function makeButton(label, onClick) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.addEventListener("click", () => void onClick());
    return b;
  }

  // src/debug/panel.ts
  function debugPanelHtml(speed) {
    const speeds = [1, 2, 5, 20].map((v) => `<button type="button" class="btn ${speed === v ? "btn-primary" : ""}" data-action="dbg-speed" data-v="${v}" data-testid="dbg-speed-${v}">${v}\u500D</button>`).join("");
    const grant2 = (label, testid, gold, tickets, premium, mats) => `<button type="button" class="btn" data-action="dbg-grant" data-gold="${gold}" data-tickets="${tickets}" data-premium="${premium}" data-mats="${mats}" data-testid="${testid}">${label}</button>`;
    return `<div class="card debug" data-testid="debug-panel"><h3>\u78BA\u8A8D\u7528\u306E\u6A5F\u80FD\uFF08\u516C\u958B\u7528\u306B\u306F\u5165\u308A\u307E\u305B\u3093\uFF09</h3><p class="mini">\u3053\u308C\u3092\u4F7F\u3046\u3068\u3001\u30D7\u30EC\u30A4\u306E\u8A18\u9332\u306B\u300C\u4F7F\u7528\u3042\u308A\u300D\u3068\u6B8B\u308A\u307E\u3059\u3002\u63A1\u70B9\u7528\u306B\u904A\u3076\u3068\u304D\u306F\u4F7F\u308F\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002</p><div class="btn-row"><span>\u901F\u5EA6</span>${speeds}</div><div class="btn-row"><span>\u6642\u9593\u3092\u9001\u308B</span><button type="button" class="btn" data-action="dbg-time" data-ms="600000" data-testid="dbg-time-10m">10\u5206</button><button type="button" class="btn" data-action="dbg-time" data-ms="3600000" data-testid="dbg-time-1h">1\u6642\u9593</button><button type="button" class="btn" data-action="dbg-time" data-ms="36000000" data-testid="dbg-time-10h">10\u6642\u9593</button><button type="button" class="btn" data-action="dbg-time" data-ms="86400000" data-testid="dbg-time-1d">1\u65E5</button></div><div class="btn-row"><span>\u4ED8\u4E0E</span>` + grant2("\u304A\u3072\u306D\u308A+1000", "dbg-gold", 1e3, 0, 0, 0) + grant2("\u304A\u3072\u306D\u308A+100\u4E07", "dbg-gold-big", 1e6, 0, 0, 0) + grant2("\u901A\u5E38\u30C1\u30B1\u30C3\u30C8+10", "dbg-ticket", 0, 10, 0, 0) + grant2("\u9AD8\u7D1A\u30C1\u30B1\u30C3\u30C8+10", "dbg-premium", 0, 0, 10, 0) + grant2("\u76F8\u68D2\u306E\u7D20\u6750+10", "dbg-mats", 0, 0, 0, 10) + `</div><div class="btn-row"><span>\u30ED\u30B0</span><button type="button" class="btn" data-action="dbg-log" data-testid="dbg-log">\u30ED\u30B0\u3092\u66F8\u304D\u51FA\u3059</button></div><div class="btn-row"><span>\u30BB\u30FC\u30D6</span><button type="button" class="btn btn-danger" data-action="dbg-reset" data-testid="dbg-reset">\u6700\u521D\u304B\u3089\u3084\u308A\u76F4\u3059</button></div></div>`;
  }

  // src/ui/main.ts
  var TICK_MS = 200;
  var AUTOSAVE_MS = 1e4;
  var MODAL_GUARD_MS = 400;
  var WELCOME_BACK_MS = 5 * 6e4;
  function need(id) {
    const found = document.getElementById(id);
    if (!found) throw new Error(`\u753B\u9762\u306E\u8981\u7D20\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093: #${id}`);
    return found;
  }
  function byTestId(testId) {
    const found = document.querySelector(`[data-testid="${testId}"]`);
    if (!found) throw new Error(`\u753B\u9762\u306E\u8981\u7D20\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093: ${testId}`);
    return found;
  }
  function randomSeed() {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] ?? 1;
  }
  function localDayKey(ms) {
    return Math.floor((ms - new Date(ms).getTimezoneOffset() * 6e4) / 864e5);
  }
  function start() {
    const content = buildContent(define_CONTENT_default);
    setArt(define_ART_default, "build-11");
    initSound();
    const session = createSession(
      { now: () => Date.now(), seed: randomSeed, dayKey: localDayKey, read: readStore, write: writeStore, backup: (text, nowMs) => void backupSave(text, nowMs), debug: true },
      content
    );
    const p = content.params;
    const ui = {
      tab: "journey",
      selectedSlot: null,
      result: null,
      detail: null,
      hero: { id: null, view: "train", filter: "all", sort: "rarity", resetArmed: false },
      feed: [],
      buildId: "build-11",
      debug: true,
      standalone: isStandalone(),
      saveStatus: "-",
      speed: 1,
      importMessage: "",
      exportText: "",
      sound: soundEnabled()
    };
    const journey = need("journey");
    const panel = need("panel");
    const info = need("journey-info");
    const tabsEl = need("tabs");
    const modalRoot = need("modal-root");
    const toastRoot = need("toast-root");
    const noticeEl = byTestId("notice");
    const hudStage = byTestId("hud-stage");
    const hudGold = byTestId("hud-gold");
    const hudTickets = byTestId("hud-tickets");
    const hudPremium = byTestId("hud-premium");
    const otherButton = byTestId("tab-other");
    const battle = createBattleView(need("field"), (fx) => play(fx));
    const fighterArt = (key) => {
      const id = fighterArtId(key);
      return id === null ? null : artUrl(id);
    };
    const backgroundFor = (stage) => stage === null ? null : artUrl(`bg_ch${chapterOf(Math.max(1, stage), p)}`);
    if (true) {
      installDebug({
        buildId: "build-11",
        getSaveText: () => session.saveText(),
        getPlayLines: () => playLogLines(session.playLog(), session.game(), content),
        mount: need("hud-debug")
      });
    }
    logEvent("load", { firstRun: session.firstRun(), opens: session.state().opens, standalone: ui.standalone, highest: session.game().highestCleared });
    tabsEl.innerHTML = TABS.map(
      (t) => `<button type="button" class="tab" data-action="tab" data-tab="${t.id}" data-testid="tab-${t.id}">${t.label}<span class="badge" hidden></span></button>`
    ).join("");
    const notices = session.notices();
    if (notices.length > 0) {
      noticeEl.textContent = notices.join(" ");
      noticeEl.hidden = false;
    }
    const toast = (text, tone2 = "") => {
      const el = document.createElement("div");
      el.className = `toast ${tone2}`;
      el.textContent = text;
      toastRoot.appendChild(el);
      while (toastRoot.children.length > 3) toastRoot.firstElementChild?.remove();
      window.setTimeout(() => el.remove(), 2600);
    };
    const feed = (text) => {
      ui.feed.unshift(text);
      if (ui.feed.length > 8) ui.feed.pop();
    };
    const modals = [];
    let modalHtml = "";
    let modalShownAt = 0;
    let modalShown = null;
    const renderModal = () => {
      const top = modals[0];
      const html = top ? top.html() : "";
      if (html === modalHtml) return;
      modalHtml = html;
      if (html === "") {
        modalRoot.hidden = true;
        modalRoot.innerHTML = "";
        modalShown = null;
        return;
      }
      if (modalRoot.hidden) modalShownAt = Date.now();
      const same = modalShown === top;
      const scroll = same ? modalRoot.querySelector(".modal")?.scrollTop ?? 0 : 0;
      modalRoot.hidden = false;
      modalRoot.innerHTML = `<div class="modal" data-testid="modal">${html}</div>`;
      modalShown = top ?? null;
      if (scroll > 0) {
        const el = modalRoot.querySelector(".modal");
        if (el) el.scrollTop = scroll;
      }
    };
    const openModal = (html, detail = false) => {
      modals.push({ html, detail });
      renderModal();
    };
    const closeModal = () => {
      if (modals[0]?.detail === true) ui.detail = null;
      modals.shift();
      modalHtml = "";
      modalShown = null;
      modalRoot.hidden = true;
      modalRoot.innerHTML = "";
      renderModal();
    };
    const handle = (events2) => {
      for (const e of events2) {
        if (e.type === "win") {
          ui.result = { type: "win", stage: e.stage, reward: e.reward, equipDefId: e.equipDefId, companionId: null };
          play("win");
          feed(`${stageLabel(e.stage, p)} \u3092\u7A81\u7834\uFF08${rewardText(e.reward)}\uFF09`);
          if (ui.tab !== "journey") toast(`${stageLabel(e.stage, p)} \u3092\u7A81\u7834\uFF01 \u304A\u3072\u306D\u308A +${formatNumber(e.reward.gold)}`, "good");
        } else if (e.type === "defeat") {
          ui.result = { type: "defeat", stage: e.stage, timedOut: e.timedOut };
          play("lose");
          feed(`${stageLabel(e.stage, p)} \u3067\u8CA0\u3051${e.timedOut ? "\uFF08\u6642\u9593\u5207\u308C\uFF09" : ""}`);
          toast(`${stageLabel(e.stage, p)} \u3067\u8CA0\u3051\u2026 \u7A3D\u53E4\u304C\u8DB3\u308A\u306A\u3044\uFF01`, "bad");
        } else if (e.type === "companion") {
          const id = e.id;
          if (ui.result !== null && ui.result.type === "win") ui.result = { ...ui.result, companionId: id };
          feed(`${content.companionById[id]?.name ?? ""} \u304C\u76F8\u68D2\u306B\u306A\u3063\u305F`);
          openModal(() => companionJoinHtml(session.game(), content, id));
        } else if (e.type === "dungeonWin") {
          ui.result = { type: "dungeonWin", kind: e.kind, tier: e.tier, got: e.got };
          play("win");
          const name = p.dungeon.kinds.find((d) => d.id === e.kind)?.name ?? "";
          feed(`${name} \u6BB5\u968E${e.tier} \u3092\u7A81\u7834`);
          if (ui.tab !== "journey") toast(`${name} \u6BB5\u968E${e.tier} \u3092\u7A81\u7834\uFF01`, "good");
        } else if (e.type === "dungeonDefeat") {
          ui.result = { type: "dungeonDefeat", kind: e.kind, tier: e.tier, timedOut: e.timedOut };
          play("lose");
          const name = p.dungeon.kinds.find((d) => d.id === e.kind)?.name ?? "";
          feed(`${name} \u6BB5\u968E${e.tier} \u3067\u8CA0\u3051`);
          if (ui.tab !== "journey") toast(`${name} \u6BB5\u968E${e.tier} \u3067\u8CA0\u3051\u2026`, "bad");
        } else if (e.type === "dailyReset") {
          toast("\u65E5\u4ED8\u304C\u5909\u308F\u308A\u3001\u65E5\u8AB2\u304C\u5165\u308C\u66FF\u308F\u308A\u307E\u3057\u305F\u3002");
        } else if (e.type === "allClear") {
          feed("\u3059\u3079\u3066\u306E\u9762\u3092\u7A81\u7834");
          toast("\u3059\u3079\u3066\u306E\u9762\u3092\u7A81\u7834\u3057\u307E\u3057\u305F\uFF01", "good");
        } else if (e.type === "clockBack") {
          toast("\u7AEF\u672B\u306E\u6642\u8A08\u304C\u623B\u3063\u3066\u3044\u305F\u306E\u3067\u3001\u96E2\u308C\u3066\u3044\u305F\u6642\u9593\u306F0\u3068\u3057\u3066\u6271\u3044\u307E\u3057\u305F\u3002");
        }
      }
    };
    let fieldKey = "";
    const syncField = () => {
      const g = session.game();
      const name = (key2) => fighterName(key2, content);
      const companionName = g.companionSlot === null ? null : content.companionById[g.companionSlot]?.name ?? null;
      const rep = session.replay();
      if (g.battle !== null && rep !== null) {
        const key2 = `battle|${rep.stage}|${rep.startedAtMs}`;
        if (key2 === fieldKey) return;
        fieldKey = key2;
        battle.show({
          stageText: rep.title,
          boss: !rep.dungeon && isBossStage(rep.stage, p),
          atMs: rep.startedAtMs,
          endsAtMs: rep.endsAtMs,
          replay: rep.replay,
          allies: rep.allies,
          enemies: rep.enemies,
          companionName: rep.companion === null ? null : content.companionById[rep.companion.key]?.name ?? null,
          name,
          art: fighterArt,
          background: backgroundFor(rep.stage),
          gaugeMax: p.battle.gaugeMax,
          gaugePerAttack: p.battle.gaugePerAttack,
          timeLimitSec: p.battle.timeLimitSec
        });
        return;
      }
      const stage = g.battle !== null ? g.battle.stage : nextStage(g, content);
      const bd = g.battle?.dungeon;
      const stageText = bd ? `${p.dungeon.kinds.find((d) => d.id === bd.kind)?.name ?? ""} \u6BB5\u968E${bd.tier}` : stage === null ? "" : stageLabel(stage, p);
      const allies = allySpecs(g, content);
      const key = `preview|${g.battle !== null ? "wait" : ""}|${stage ?? "-"}|${companionName ?? "-"}|${allies.map((a) => `${a.key}:${a.row}:${a.hp}`).join(",")}`;
      if (key === fieldKey) return;
      fieldKey = key;
      battle.preview({
        stageText,
        boss: !bd && stage !== null && isBossStage(stage, p),
        allies,
        enemies: stage === null ? [] : enemySpecs(stage, content),
        companionName,
        name,
        art: fighterArt,
        background: backgroundFor(stage),
        banner: g.battle !== null ? "\u6226\u95D8\u4E2D\u2026" : void 0
      });
    };
    const lastHtml = {};
    const setHtml = (target, key, html) => {
      if (lastHtml[key] === html) return;
      lastHtml[key] = html;
      const area = target.querySelector('[data-testid="import-area"]');
      const typed = area ? area.value : "";
      const top = target.scrollTop;
      const inner = {};
      for (const el of Array.from(target.querySelectorAll("[data-scroll-key]"))) inner[el.dataset["scrollKey"] ?? ""] = el.scrollTop;
      target.innerHTML = html;
      target.scrollTop = top;
      for (const el of Array.from(target.querySelectorAll("[data-scroll-key]"))) {
        const v = inner[el.dataset["scrollKey"] ?? ""];
        if (v !== void 0) el.scrollTop = v;
      }
      if (typed !== "") {
        const again = target.querySelector('[data-testid="import-area"]');
        if (again) again.value = typed;
      }
    };
    const applyLive = (root, values) => {
      for (const el of Array.from(root.querySelectorAll("[data-live]"))) {
        const v = values[el.dataset["live"] ?? ""];
        if (v !== void 0 && el.textContent !== v) el.textContent = v;
      }
      for (const el of Array.from(root.querySelectorAll("[data-live-width]"))) {
        const v = values[el.dataset["liveWidth"] ?? ""];
        if (v !== void 0 && el.style.width !== v) el.style.width = v;
      }
    };
    let lastGold = -1;
    const render = () => {
      const g = session.game();
      const now = session.now();
      ui.saveStatus = !session.canSave() ? "\u4FDD\u5B58\u3057\u306A\u3044" : session.lastSaveOk() ? "\u4FDD\u5B58\u6E08\u307F" : "\u4FDD\u5B58\u306B\u5931\u6557";
      ui.speed = session.speed();
      const next = nextStage(g, content);
      hudStage.textContent = next === null ? "\u9054\u6210" : stageLabel(next, p);
      hudGold.textContent = formatNumber(g.gold);
      hudTickets.textContent = String(g.tickets);
      hudPremium.textContent = String(g.premiumTickets);
      if (lastGold >= 0 && g.gold > lastGold) {
        hudGold.classList.remove("pop");
        void hudGold.offsetWidth;
        hudGold.classList.add("pop");
      }
      lastGold = g.gold;
      const b = badges(g, content, now);
      for (const btn of Array.from(tabsEl.querySelectorAll(".tab"))) {
        const id = btn.dataset["tab"];
        btn.classList.toggle("active", id === ui.tab);
        const badge = btn.querySelector(".badge");
        if (badge) badge.hidden = !b[id] || id === ui.tab;
      }
      otherButton.classList.toggle("active", ui.tab === "other");
      syncField();
      const onJourney = ui.tab === "journey";
      journey.hidden = !onJourney;
      panel.hidden = onJourney;
      panel.classList.toggle("panel-hero", ui.tab === "members");
      if (onJourney) {
        setHtml(info, "journey", journeyInfoHtml(g, content, ui, now));
        applyLive(info, journeyLive(g, content, now));
      } else if (ui.tab === "members") {
        setHtml(panel, "panel", membersHtml(g, content, ui.hero));
      } else if (ui.tab === "party") {
        setHtml(panel, "panel", partyHtml(g, content, ui));
      } else if (ui.tab === "companions") {
        setHtml(panel, "panel", companionsHtml(g, content));
      } else if (ui.tab === "recruit") {
        setHtml(panel, "panel", recruitHtml(g, content));
      } else if (ui.tab === "missions") {
        setHtml(panel, "panel", missionsHtml(g, content));
      } else if (ui.tab === "dungeon") {
        setHtml(panel, "panel", dungeonHtml(g, content));
      } else {
        setHtml(panel, "panel", otherHtml(g, content, ui, true ? debugPanelHtml(ui.speed) : ""));
      }
      renderModal();
    };
    const firstEmptySlot = () => {
      const i = session.game().party.indexOf(null);
      return i >= 0 ? i : null;
    };
    const setTab = (tab) => {
      ui.tab = tab;
      ui.selectedSlot = tab === "party" ? firstEmptySlot() : null;
      ui.hero = { ...ui.hero, resetArmed: false };
      lastHtml["panel"] = "";
      panel.innerHTML = "";
      panel.scrollTop = 0;
    };
    const fail = (reason) => {
      if (reason) {
        toast(reason, "bad");
        play("error");
      }
    };
    const claimAll = () => {
      const total = { gold: 0, tickets: 0, premiumTickets: 0, mats: 0 };
      let count = 0;
      for (let guard = 0; guard < 200; guard++) {
        const g = session.game();
        const mission = missionList(g, content).find((m) => m.claimable);
        const daily = mission ? void 0 : dailyList(g, content).find((d) => d.claimable);
        const r = mission ? session.claimMission(mission.def.id) : daily ? session.claimDaily(daily.def.id) : null;
        if (r === null || !r.ok || !r.reward) break;
        count += 1;
        total.gold += r.reward.gold;
        total.tickets += r.reward.tickets;
        total.premiumTickets += r.reward.premiumTickets;
        total.mats += r.reward.mats;
      }
      return { count, total };
    };
    const OWN_SOUND = /* @__PURE__ */ new Set(["recruit", "collect", "claim-mission", "claim-daily", "claim-all", "dungeon-sweep", "levelup", "level-confirm", "promote", "enhance"]);
    const onAction = (el) => {
      const action = el.dataset["action"] ?? "";
      const id = el.dataset["id"] ?? "";
      if (!OWN_SOUND.has(action)) play("tap");
      switch (action) {
        case "tab":
          setTab(el.dataset["tab"] ?? "journey");
          break;
        case "goto-members":
          setTab("members");
          break;
        case "challenge": {
          const r = session.challenge();
          if (r.ok) ui.result = null;
          else fail(r.reason);
          break;
        }
        case "dungeon-challenge": {
          const r = session.challengeDungeon(el.dataset["kind"] ?? "");
          if (r.ok) {
            ui.result = null;
            setTab("journey");
          } else fail(r.reason);
          break;
        }
        case "dungeon-sweep": {
          const r = session.sweepDungeon(el.dataset["kind"] ?? "");
          if (r.ok && r.got) {
            const parts = [];
            if (r.got.gold > 0) parts.push(`\u304A\u3072\u306D\u308A +${formatNumber(r.got.gold)}`);
            if (r.got.mats > 0) parts.push(`\u76F8\u68D2\u306E\u7D20\u6750 +${r.got.mats}`);
            if (r.got.equips.length > 0) parts.push(`\u88C5\u5099 +${r.got.equips.length}`);
            toast(`\u6E05\u6383: ${parts.join("\u3001")}`, "good");
            play("coin");
          } else fail(r.reason);
          break;
        }
        case "collect": {
          const r = session.collectIdle();
          if (r.ok) {
            const mats = Object.entries(r.mats ?? {}).map(([cid, n]) => `${content.companionById[cid]?.material ?? ""} +${n}`).join("\u3001");
            const equips = (r.equips ?? []).length;
            toast(`\u7BB1\u304B\u3089 \u304A\u3072\u306D\u308A +${formatNumber(r.gold ?? 0)}${mats ? `\u3001${mats}` : ""}${equips > 0 ? `\u3001\u88C5\u5099 +${equips}` : ""}`, "good");
            play("coin");
          } else fail(r.reason);
          break;
        }
        case "levelup": {
          const own = session.game().members[id];
          const def = content.byId[id];
          if (!own || !def) break;
          const ten = el.dataset["n"] === "10";
          const target = ten ? Math.min(own.level + 10, levelCap(def, own.plus, p)) : own.level + 1;
          const r = session.levelUpTo(id, target, ten ? "+10" : "+1");
          if (r.ok) play("levelup");
          if (r.ok && ten) toast(`${def.name} \u306E\u30EC\u30D9\u30EB +${r.levels ?? 0}`, "good");
          else if (!r.ok) fail(r.reason);
          break;
        }
        case "select":
          ui.hero = { ...ui.hero, id, resetArmed: false };
          break;
        case "hero-view":
          ui.hero = { ...ui.hero, view: el.dataset["v"] === "equip" ? "equip" : "train", resetArmed: false };
          break;
        case "filter":
          ui.hero = { ...ui.hero, filter: el.dataset["v"] ?? "all" };
          break;
        case "sort":
          ui.hero = { ...ui.hero, sort: el.dataset["v"] === "level" ? "level" : "rarity" };
          break;
        case "list-options":
          openModal(() => listOptionsHtml(session.game(), content, ui.hero));
          break;
        case "help": {
          const topic = el.dataset["topic"] ?? "members";
          openModal(() => helpHtml(session.game(), content, topic));
          break;
        }
        case "level-open": {
          const own = session.game().members[id];
          if (!own) break;
          ui.detail = { id, view: "level", slot: null, target: own.level + 1 };
          openModal(() => ui.detail ? memberModalHtml(session.game(), content, ui.detail) : "", true);
          break;
        }
        case "level-step":
        case "level-max": {
          const d = ui.detail;
          const own = d ? session.game().members[d.id] : void 0;
          if (!d || !own) break;
          const max = Math.max(own.level + 1, maxAffordableLevel(session.game(), d.id, content));
          const current = Math.max(own.level + 1, Math.min(d.target, max));
          const next = action === "level-max" ? max : current + Number(el.dataset["d"] ?? "0");
          ui.detail = { ...d, target: Math.max(own.level + 1, Math.min(next, max)) };
          break;
        }
        case "level-confirm": {
          const d = ui.detail;
          const own = d ? session.game().members[d.id] : void 0;
          if (!d || !own) break;
          const max = Math.max(own.level + 1, maxAffordableLevel(session.game(), d.id, content));
          const target = Math.max(own.level + 1, Math.min(d.target, max));
          const r = session.levelUpTo(d.id, target, "\u6307\u5B9A");
          if (r.ok) {
            toast(`${content.byId[d.id]?.name ?? ""} \u3092 Lv ${target} \u306B\u4E0A\u3052\u307E\u3057\u305F\uFF08+${r.levels ?? 0}\uFF09`, "good");
            play("levelup");
            closeModal();
          } else fail(r.reason);
          break;
        }
        case "reset":
          ui.hero = { ...ui.hero, resetArmed: true };
          break;
        case "reset-confirm": {
          const r = session.resetLevel(id);
          if (r.ok) toast(`${content.byId[id]?.name ?? ""} \u3092\u30EA\u30BB\u30C3\u30C8\u3057\u307E\u3057\u305F\u3002\u304A\u3072\u306D\u308A +${formatNumber(r.refund ?? 0)}`, "good");
          else fail(r.reason);
          ui.hero = { ...ui.hero, resetArmed: false };
          break;
        }
        case "promote": {
          const r = session.promote(id);
          if (r.ok) {
            toast(`${content.byId[id]?.name ?? ""} \u304C\u6607\u683C\uFF01\uFF08+${session.game().members[id]?.plus ?? 0}\uFF09`, "good");
            play("gachaRare");
          } else fail(r.reason);
          break;
        }
        case "slot-open": {
          const mid = heroSelectedId(session.game(), content, ui.hero);
          if (mid === null) break;
          ui.detail = { id: mid, view: "slot", slot: el.dataset["slot"] ?? "weapon", target: 0 };
          openModal(() => ui.detail ? memberModalHtml(session.game(), content, ui.detail) : "", true);
          break;
        }
        case "equip": {
          const d = ui.detail;
          if (!d) break;
          const r = session.equip(Number(el.dataset["uid"]), d.id);
          if (r.ok) closeModal();
          else fail(r.reason);
          break;
        }
        case "unequip": {
          const r = session.unequip(Number(el.dataset["uid"]));
          if (!r.ok) fail(r.reason);
          break;
        }
        case "enhance": {
          const uid = Number(el.dataset["uid"]);
          const r = session.enhance(uid);
          if (r.ok) {
            const item = session.game().equips.find((e) => e.uid === uid);
            const def = item ? content.equipById[item.defId] : void 0;
            if (item && def) toast(`${equipName(def, item.level)} \u306B\u5F37\u5316\u3057\u307E\u3057\u305F`, "good");
            play("levelup");
          } else fail(r.reason);
          break;
        }
        case "auto-equip": {
          const r = session.autoEquip(id);
          if (r.ok) toast(`\u88C5\u5099\u3092 ${r.changed ?? 0}\u304B\u6240\u3001\u4ED8\u3051\u66FF\u3048\u307E\u3057\u305F`, "good");
          else fail(r.reason);
          break;
        }
        case "unequip-all": {
          const r = session.unequipAll(id);
          if (r.ok) toast(`\u88C5\u5099\u3092 ${r.removed ?? 0}\u3053\u5916\u3057\u307E\u3057\u305F`, "good");
          else fail(r.reason);
          break;
        }
        case "slot": {
          const slot = Number(el.dataset["slot"]);
          ui.selectedSlot = ui.selectedSlot === slot ? null : slot;
          break;
        }
        case "place": {
          if (ui.selectedSlot === null) break;
          const r = session.setSlot(ui.selectedSlot, id);
          if (r.ok) ui.selectedSlot = firstEmptySlot();
          else fail(r.reason);
          break;
        }
        case "remove": {
          if (ui.selectedSlot === null) break;
          const r = session.setSlot(ui.selectedSlot, null);
          if (!r.ok) fail(r.reason);
          break;
        }
        case "recruit": {
          const banner = el.dataset["banner"] === "premium" ? "premium" : "normal";
          const r = session.recruit(banner, Number(el.dataset["count"] ?? "1"));
          if (r.ok && r.results) {
            const outcomes = r.results;
            const rare = outcomes.some((o) => (p.recruit.rarities[content.byId[o.id]?.rarity ?? ""]?.stars ?? 0) >= 3);
            play(rare ? "gachaRare" : "gacha");
            openModal(() => recruitResultHtml(session.game(), content, outcomes));
          } else fail(r.reason);
          break;
        }
        case "rates": {
          const banner = el.dataset["banner"] === "premium" ? "premium" : "normal";
          openModal(() => ratesHtml(session.game(), content, banner));
          break;
        }
        case "fill-empty": {
          let placed = 0;
          for (let guard = 0; guard < 6; guard++) {
            const g = session.game();
            const slot = g.party.indexOf(null);
            if (slot < 0) break;
            const rank = (mid) => {
              const r = p.recruit.rarities[content.byId[mid]?.rarity ?? ""];
              return (r?.stars ?? 0) * 10 + (r?.statMult ?? 0);
            };
            const bench = Object.keys(g.members).filter((mid) => !g.party.includes(mid)).sort((a, b) => rank(b) - rank(a));
            const best = bench[0];
            if (best === void 0 || !session.setSlot(slot, best).ok) break;
            placed += 1;
          }
          if (placed > 0) {
            for (let guard = 0; guard < 6; guard++) {
              const g = session.game();
              const hp = (mid) => battleStats(g, mid, content)?.hp ?? 0;
              const ids = g.party.filter((x) => x !== null).sort((a, b) => hp(b) - hp(a));
              const sturdy = ids.slice(0, Math.min(FRONT_SIZE, ids.length));
              const frontSlot = g.party.findIndex((x, i) => i < FRONT_SIZE && (x === null || !sturdy.includes(x)));
              const backSlot = g.party.findIndex((x, i) => i >= FRONT_SIZE && x !== null && sturdy.includes(x));
              if (frontSlot < 0 || backSlot < 0) break;
              if (!session.setSlot(frontSlot, g.party[backSlot]).ok) break;
            }
            toast(`${placed}\u4EBA\u3092\u7DE8\u6210\u306B\u5165\u308C\u3001\u4F53\u529B\u306E\u9AD8\u3044\u9806\u306B\u524D\u5217\u3078\u4E26\u3079\u307E\u3057\u305F`, "good");
          }
          closeModal();
          break;
        }
        case "companion-equip":
        case "equip-close": {
          const r = session.setCompanion(id);
          if (r.ok) toast(`${content.companionById[id]?.name ?? ""} \u3092\u7DE8\u6210\u306B\u5165\u308C\u307E\u3057\u305F`, "good");
          else if (action === "companion-equip") fail(r.reason);
          if (action === "equip-close") closeModal();
          break;
        }
        case "companion-unequip": {
          const r = session.setCompanion(null);
          if (!r.ok) fail(r.reason);
          break;
        }
        case "companion-levelup": {
          const r = session.companionLevelUp(id);
          if (r.ok) toast(`${content.companionById[id]?.name ?? ""} \u306E\u30EC\u30D9\u30EB\u304C\u4E0A\u304C\u308A\u307E\u3057\u305F`, "good");
          else fail(r.reason);
          break;
        }
        case "claim-mission":
        case "claim-daily": {
          const r = action === "claim-mission" ? session.claimMission(id) : session.claimDaily(id);
          if (r.ok && r.reward) {
            toast(`\u5831\u916C: ${rewardText(r.reward)}`, "good");
            play("coin");
          } else fail(r.reason);
          break;
        }
        case "claim-all": {
          const r = claimAll();
          if (r.count > 0) {
            toast(`${r.count}\u4EF6\u306E\u5831\u916C: ${rewardText(r.total)}`, "good");
            play("coin");
          } else fail("\u53D7\u3051\u53D6\u308C\u308B\u5831\u916C\u304C\u3042\u308A\u307E\u305B\u3093");
          break;
        }
        case "close-modal":
          closeModal();
          break;
        case "dismiss-notice":
          noticeEl.hidden = true;
          break;
        case "export":
          ui.exportText = session.exportSave();
          break;
        case "copy-export":
          void navigator.clipboard?.writeText(ui.exportText).then(
            () => toast("\u30B3\u30D4\u30FC\u3057\u307E\u3057\u305F", "good"),
            () => toast("\u30B3\u30D4\u30FC\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u6B04\u3092\u9577\u62BC\u3057\u3057\u3066\u3001\u3059\u3079\u3066\u9078\u629E\u3057\u3066\u30B3\u30D4\u30FC\u3057\u3066\u304F\u3060\u3055\u3044\u3002", "bad")
          );
          break;
        case "import": {
          const area = panel.querySelector('[data-testid="import-area"]');
          const r = session.importSave(area ? area.value : "");
          ui.importMessage = r.ok ? "\u8AAD\u307F\u8FBC\u307F\u307E\u3057\u305F\u3002" : `\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3067\u3057\u305F: ${r.reason ?? ""}`;
          if (r.ok) {
            if (area) area.value = "";
            ui.result = null;
            ui.feed = [];
          }
          logEvent("import", { ok: r.ok, reason: r.reason ?? "" });
          break;
        }
        case "sound-toggle":
          setSoundEnabled(!soundEnabled());
          ui.sound = soundEnabled();
          if (ui.sound) play("tap");
          break;
        case "dbg-speed":
          session.debugSetSpeed(Number(el.dataset["v"]));
          break;
        case "dbg-time":
          session.debugAddTime(Number(el.dataset["ms"]));
          toast("\u6642\u9593\u3092\u9001\u308A\u307E\u3057\u305F");
          break;
        case "dbg-grant":
          session.debugGrant({ gold: Number(el.dataset["gold"]), tickets: Number(el.dataset["tickets"]), premiumTickets: Number(el.dataset["premium"]), mats: Number(el.dataset["mats"]) });
          break;
        case "dbg-reset":
          if (el.dataset["armed"] === "1") {
            session.debugReset();
            ui.feed = [];
            ui.result = null;
            ui.detail = null;
            ui.hero = { id: null, view: "train", filter: "all", sort: "rarity", resetArmed: false };
            ui.exportText = "";
            ui.importMessage = "";
            lastHtml["panel"] = "";
            setTab("journey");
            toast("\u6700\u521D\u304B\u3089\u3084\u308A\u76F4\u3057\u307E\u3057\u305F");
          } else {
            el.dataset["armed"] = "1";
            el.textContent = "\u3082\u3046\u4E00\u5EA6\u62BC\u3059\u3068\u3001\u6700\u521D\u304B\u3089\u306B\u306A\u308A\u307E\u3059";
            return;
          }
          break;
        case "dbg-log":
          if (true) openLogSheet();
          break;
        default:
          break;
      }
      handle(session.tick());
      render();
    };
    for (const type of ["pointerdown", "touchend", "click"]) document.addEventListener(type, () => unlockSound(), { passive: true });
    document.addEventListener("click", (ev) => {
      if (ev.target === modalRoot && !modalRoot.hidden) {
        if (Date.now() - modalShownAt >= MODAL_GUARD_MS) {
          closeModal();
          handle(session.tick());
          render();
        }
        return;
      }
      const target = ev.target instanceof Element ? ev.target.closest("[data-action]") : null;
      if (!target || target instanceof HTMLButtonElement && target.disabled) return;
      if (modalRoot.contains(target) && Date.now() - modalShownAt < MODAL_GUARD_MS) return;
      onAction(target);
    });
    let lastSaveAt = Date.now();
    const frame = () => {
      handle(session.tick());
      render();
      const t = Date.now();
      if (t - lastSaveAt >= AUTOSAVE_MS) {
        lastSaveAt = t;
        session.save();
      }
    };
    window.setInterval(frame, TICK_MS);
    const animate = () => {
      if (ui.tab === "journey") battle.update(session.now());
      window.requestAnimationFrame(animate);
    };
    window.requestAnimationFrame(animate);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") session.save();
      else frame();
    });
    window.addEventListener("pagehide", () => session.save());
    frame();
    session.save();
    if (!session.firstRun() && session.awayMs() >= WELCOME_BACK_MS && idlePending(session.game(), session.now(), content).gold > 0) {
      toast("\u304A\u304B\u3048\u308A\u306A\u3055\u3044\u3002\u7BB1\u306B\u3001\u304A\u3072\u306D\u308A\u304C\u8CAF\u307E\u3063\u3066\u3044\u307E\u3059\u3002", "good");
    }
    void requestPersistence().then((granted) => logEvent("persist", { granted: String(granted) }));
  }
  start();
})();
//# sourceMappingURL=app.js.map
