// ビルド時に scripts/build.ts が埋め込む値。
declare const __BUILD_ID__: string;
declare const __DEBUG__: boolean;
/** 数値（params/base.json）と団員の定義（params/members.json）。ビルド時に埋め込む。 */
declare const __PARAMS__: unknown;
declare const __MEMBERS__: unknown;
