// ビルド時に scripts/build.ts が埋め込む値。
declare const __BUILD_ID__: string;
declare const __DEBUG__: boolean;
/** 数値と定義（params/*.json の中身）。ビルド時に埋め込む。 */
declare const __CONTENT__: unknown;
