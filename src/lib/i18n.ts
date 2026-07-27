export type Language = "zh-CN" | "zh-TW" | "lzh" | "en" | "ja" | "eo";

export const LANGUAGE_KEY = "weft.language";

export const COPY = {
  "zh-CN": {
    /* 首页 */
    landing_title: "打开一个 WEFT 故事",
    landing_description: "选择 YAML 文件后，即可查看故事、moai、drift 和叙事时间线。",
    landing_formats: "支持 .yaml 和 .yml 文件",
    landing_choose: "选择 YAML 文件",
    landing_opening: "正在打开…",
    landing_recent: "最近打开",
    landing_no_recent: "还没有最近打开的故事",
    landing_open_failed: "打开失败",
    landing_file_lost_title: "当前故事文件不见了",
    landing_file_lost_hint:
      "它可能被移动或删除。可在文件管理器中确认后再重新定位。",
    landing_locate: "重新定位…",
    landing_close_story: "关闭故事",
    landing_watching: "正在监听文件变化",
    landing_invalid_drop: "只支持 .yaml 或 .yml 文件",
    landing_drop_to_open: "松开以打开此 YAML",

    /* 页面状态 */
    page_loading: "加载中",
    page_retry: "重试",
    page_error_default: "页面加载失败",
    page_error_render: "页面渲染失败",
    error_load_story: "故事加载失败",
    error_load_moai: "moai 加载失败",
    error_load_drift: "drift 加载失败",
    error_load_moai_links: "moai link 加载失败",
    error_load_narrative: "叙事加载失败",
    moai_search: "搜索 moai",

    /* 事件通知 */
    event_reloaded: "故事已重新加载",
    event_reload_failed: "故事重新加载失败",
    event_dismiss: "关闭",

    /* 设置 */
    settings_title: "偏好设置",
    settings_language: "界面语言",
    settings_mcp_status: "MCP 服务",
    settings_mcp_hint:
      "MCP server 由你的 Agent（Claude Code、Codex 等）自动启停，桌面端不参与。配置方法见文档。",
    settings_mcp_docs: "查看 MCP 配置文档",
    settings_done: "完成",

    /* 快速切换 */
    switch_title: "切换故事",
    switch_placeholder: "搜索最近打开的故事…",
    switch_empty: "还没有最近打开的故事",
    switch_no_match: "没有匹配的故事",

    /* 错误消息 */
    FILE_NOT_FOUND: "文件不存在",
    FILE_READ_FAILED: "读取故事文件失败",
    DOCUMENT_PARSE_FAILED: "解析故事文件失败",
    SCHEMA_INVALID: "故事结构无效",
    REFERENCE_NOT_FOUND: "引用不存在",
    PLUGIN_FAILED: "插件失败",
    STORY_NOT_LOADED: "尚未加载故事",

    /* 用户提示 */
    STORY_NOT_LOADED_HINT: "先在桌面应用中打开一个 WEFT 故事文件",

    /* 导航 */
    nav_story: "故事",
    nav_moai: "Moai",
    nav_moai_link: "关系",
    nav_drift: "Drift",
    nav_narrative: "叙事",

    /* 故事页 */
    story_calendar: "历法",
    story_builtin: "内置",
    story_plugin: "插件",
    story_mode: "模式",

    /* Moai 页 */
    moai_title: "Moai",
    moai_materials: "素材",
    moai_timeline: "时间线",
    moai_count: "第 {n} / 共 {t} 个 Moai",
    moai_events_empty: "暂无 drift 事件。",
    moai_event_count: "{n} 个事件",
    moai_event_count_plural: "{n} 个事件",
    moai_search_empty: '未找到包含 "{q}" 的 Moai。',
    moai_empty: "暂无 Moai。",

    /* 关系图页 */
    graph_title: "关系",
    graph_subtitle: "选择关系类型，查看并探索 Moai 之间的连接。",
    graph_search_placeholder: "查找节点",
    graph_zoom_out: "缩小",
    graph_zoom_in: "放大",
    graph_fit_view: "适应视图",
    graph_reset_view: "重置视图",
    graph_canvas_hint: "拖动画布 · Ctrl/⌘ + 滚轮缩放",
    graph_close_detail: "关闭节点详情",
    graph_type_aria: "关系类型",
    graph_node_count: "{n} 个节点 · {l} 条关系",
    graph_view_node: "查看 {name}",
    link_empty: "暂无 moai 关系。",

    /* Drift 页 */
    drift_title: "Drift",
    drift_empty: "暂无 drift 事件。",
    drift_count: "共 {s} 季 {n} 个事件",

    /* Gantt */
    gantt_event: "事件",
    gantt_duration: "持续",
    gantt_milestone: "节点",

    /* 事件卡片 */
    event_no_base_time: "无基准时间",

    /* 叙事页 */
    narrative_title: "叙事",
    narrative_empty: "暂无叙事时间线。",
    narrative_count: "共 {s} 条叙事 {n} 个事件",
    narrative_observer: "观察者：{o} · 主题：{t}",
  },

  "zh-TW": {
    /* 首頁 */
    landing_title: "開啟 WEFT 故事",
    landing_description:
      "選擇 YAML 檔案後，即可檢視故事、moai、drift 和敘事時間線。",
    landing_formats: "支援 .yaml 和 .yml 檔案",
    landing_choose: "選擇 YAML 檔案",
    landing_opening: "正在開啟…",
    landing_recent: "最近開啟",
    landing_no_recent: "還沒有最近開啟的故事",
    landing_open_failed: "開啟失敗",
    landing_file_lost_title: "目前故事檔案不見了",
    landing_file_lost_hint:
      "它可能被移動或刪除。可在檔案管理員中確認後再重新定位。",
    landing_locate: "重新定位…",
    landing_close_story: "關閉故事",
    landing_watching: "正在監聽檔案變更",
    landing_invalid_drop: "只支援 .yaml 或 .yml 檔案",
    landing_drop_to_open: "放開以開啟此 YAML",

    /* 頁面狀態 */
    page_loading: "載入中",
    page_retry: "重試",
    page_error_default: "頁面載入失敗",
    page_error_render: "頁面渲染失敗",
    error_load_story: "故事載入失敗",
    error_load_moai: "moai 載入失敗",
    error_load_drift: "drift 載入失敗",
    error_load_moai_links: "moai link 載入失敗",
    error_load_narrative: "敘事載入失敗",
    moai_search: "搜尋 moai",

    /* 事件通知 */
    event_reloaded: "故事已重新載入",
    event_reload_failed: "故事重新載入失敗",
    event_dismiss: "關閉",

    /* 設定 */
    settings_title: "偏好設定",
    settings_language: "介面語言",
    settings_mcp_status: "MCP 服務",
    settings_mcp_hint:
      "MCP server 由你的 Agent（Claude Code、Codex 等）自動啟停，桌面端不參與。配置方法見文件。",
    settings_mcp_docs: "檢視 MCP 設定文件",
    settings_done: "完成",

    /* 快速切換 */
    switch_title: "切換故事",
    switch_placeholder: "搜尋最近開啟的故事…",
    switch_empty: "還沒有最近開啟的故事",
    switch_no_match: "沒有符合的故事",

    /* 錯誤訊息 */
    FILE_NOT_FOUND: "檔案不存在",
    FILE_READ_FAILED: "讀取故事檔案失敗",
    DOCUMENT_PARSE_FAILED: "解析故事檔案失敗",
    SCHEMA_INVALID: "故事結構無效",
    REFERENCE_NOT_FOUND: "引用不存在",
    PLUGIN_FAILED: "插件失敗",
    STORY_NOT_LOADED: "尚未載入故事",

    /* 使用者提示 */
    STORY_NOT_LOADED_HINT: "先在桌面應用程式中開啟 WEFT 故事檔案",

    /* 導覽 */
    nav_story: "故事",
    nav_moai: "Moai",
    nav_moai_link: "關係",
    nav_drift: "Drift",
    nav_narrative: "敘事",

    /* 故事頁 */
    story_calendar: "曆法",
    story_builtin: "內建",
    story_plugin: "插件",
    story_mode: "模式",

    /* Moai 頁 */
    moai_title: "Moai",
    moai_materials: "素材",
    moai_timeline: "時間線",
    moai_count: "第 {n} / 共 {t} 個 Moai",
    moai_events_empty: "暫無 drift 事件。",
    moai_event_count: "{n} 個事件",
    moai_event_count_plural: "{n} 個事件",
    moai_search_empty: '未找到包含 "{q}" 的 Moai。',
    moai_empty: "暫無 Moai。",

    /* 關係圖頁 */
    graph_title: "關係",
    graph_subtitle: "選擇關係類型，檢視並探索 Moai 之間的連線。",
    graph_search_placeholder: "查詢節點",
    graph_zoom_out: "縮小",
    graph_zoom_in: "放大",
    graph_fit_view: "適應檢視",
    graph_reset_view: "重設檢視",
    graph_canvas_hint: "拖曳畫布 · Ctrl/⌘ + 滾輪縮放",
    graph_close_detail: "關閉節點詳情",
    graph_type_aria: "關係類型",
    graph_node_count: "{n} 個節點 · {l} 條關係",
    graph_view_node: "檢視 {name}",
    link_empty: "暫無 moai 關係。",

    /* Drift 頁 */
    drift_title: "Drift",
    drift_empty: "暫無 drift 事件。",
    drift_count: "共 {s} 季 {n} 個事件",

    /* Gantt */
    gantt_event: "事件",
    gantt_duration: "持續",
    gantt_milestone: "節點",

    /* 事件卡片 */
    event_no_base_time: "無基準時間",

    /* 敘事頁 */
    narrative_title: "敘事",
    narrative_empty: "暫無敘事時間線。",
    narrative_count: "共 {s} 條敘事 {n} 個事件",
    narrative_observer: "觀察者：{o} · 主題：{t}",
  },

  lzh: {
    /* 首 */
    landing_title: "啟 WEFT 故事",
    landing_description: "揀 YAML 檔，以觀故事、Moai、Drift、敍事之時序。",
    landing_formats: "唯 .yaml .yml 可用",
    landing_choose: "選 YAML 檔",
    landing_opening: "啟中…",
    landing_recent: "近啟",
    landing_no_recent: "尚無近啟故事",
    landing_open_failed: "啟敗",
    landing_file_lost_title: "當今故事檔已失",
    landing_file_lost_hint: "或已移刪，可於檔管中覆按而復尋之。",
    landing_locate: "復尋…",
    landing_close_story: "闔故事",
    landing_watching: "監視檔變",
    landing_invalid_drop: "唯 .yaml .yml 可也",
    landing_drop_to_open: "釋以啟此 YAML",

    /* 頁態 */
    page_loading: "載入中",
    page_retry: "再試",
    page_error_default: "載入此頁敗",
    page_error_render: "繪製此頁敗",
    error_load_story: "載故事敗",
    error_load_moai: "載 Moai 敗",
    error_load_drift: "載 Drift 敗",
    error_load_moai_links: "載 Moai 繫敗",
    error_load_narrative: "載敍事敗",
    moai_search: "索 Moai",

    /* 事告 */
    event_reloaded: "故事已重載",
    event_reload_failed: "故事重載敗",
    event_dismiss: "隱",

    /* 設 */
    settings_title: "設",
    settings_language: "語",
    settings_mcp_status: "MCP 伺服",
    settings_mcp_hint:
      "MCP 伺服由爾 Agent（Claude Code、Codex 等）自啟停，桌面不與。設法見文。",
    settings_mcp_docs: "啟 MCP 設文",
    settings_done: "可",

    /* 速切 */
    switch_title: "易故事",
    switch_placeholder: "索近啟故事…",
    switch_empty: "尚無近啟故事",
    switch_no_match: "無合者",

    /* 謬 */
    FILE_NOT_FOUND: "檔無",
    FILE_READ_FAILED: "讀故事檔敗",
    DOCUMENT_PARSE_FAILED: "析故事檔敗",
    SCHEMA_INVALID: "故事構謬",
    REFERENCE_NOT_FOUND: "引無",
    PLUGIN_FAILED: "插件敗",
    STORY_NOT_LOADED: "尚未載故事",

    /* 提 */
    STORY_NOT_LOADED_HINT: "請先於桌面程式中啟 WEFT 故事檔",

    /* 導 */
    nav_story: "故事",
    nav_moai: "Moai",
    nav_moai_link: "繫",
    nav_drift: "Drift",
    nav_narrative: "敍事",

    /* 故事頁 */
    story_calendar: "曆",
    story_builtin: "內建",
    story_plugin: "插件",
    story_mode: "式",

    /* 墨埃頁 */
    moai_title: "Moai",
    moai_materials: "材",
    moai_timeline: "時線",
    moai_count: "{n}/{t} Moai",
    moai_events_empty: "尚無 Drift 事。",
    moai_event_count: "{n} 事",
    moai_event_count_plural: "{n} 事",
    moai_search_empty: "無「{q}」之 Moai。",
    moai_empty: "尚無 Moai。",

    /* 繫圖頁 */
    graph_title: "繫",
    graph_subtitle: "選繫類，觀 Moai 之交。",
    graph_search_placeholder: "索點",
    graph_zoom_out: "縮",
    graph_zoom_in: "放",
    graph_fit_view: "適屏",
    graph_reset_view: "復原",
    graph_canvas_hint: "拖布 · Ctrl/⌘ + 輥縮",
    graph_close_detail: "闔點詳",
    graph_type_aria: "繫類",
    graph_node_count: "{n} 點 · {l} 繫",
    graph_view_node: "觀 {name}",
    link_empty: "尚無 Moai 繫。",

    /* 流頁 */
    drift_title: "Drift",
    drift_empty: "尚無 Drift 事。",
    drift_count: "共 {s} 季 {n} 事",

    /* 時軸 */
    gantt_event: "事",
    gantt_duration: "延",
    gantt_milestone: "點",

    /* 事卡 */
    event_no_base_time: "無基時",

    /* 敍事頁 */
    narrative_title: "敍事",
    narrative_empty: "尚無敍事時線。",
    narrative_count: "共 {s} 敍事 {n} 事",
    narrative_observer: "觀者：{o} · 題：{t}",
  },

  ja: {
    /* トップ */
    landing_title: "WEFT ストーリーを開く",
    landing_description:
      "YAML ファイルを選択すると、ストーリー、moai、drift、ナラティブタイムラインを表示できます。",
    landing_formats: ".yaml および .yml ファイルに対応",
    landing_choose: "YAML ファイルを選択",
    landing_opening: "開いています…",
    landing_recent: "最近開いたファイル",
    landing_no_recent: "最近開いたストーリーはありません",
    landing_open_failed: "開けませんでした",
    landing_file_lost_title: "現在のストーリーファイルが見つかりません",
    landing_file_lost_hint:
      "ファイルが移動または削除された可能性があります。ファイラーで確認してから再特定してください。",
    landing_locate: "再特定…",
    landing_close_story: "ストーリーを閉じる",
    landing_watching: "ファイルの変更を監視中",
    landing_invalid_drop: ".yaml または .yml ファイルのみ対応しています",
    landing_drop_to_open: "離してこの YAML を開く",

    /* ページ状態 */
    page_loading: "読み込み中",
    page_retry: "再試行",
    page_error_default: "このページの読み込みに失敗しました",
    page_error_render: "このページの描画に失敗しました",
    error_load_story: "ストーリーの読み込みに失敗しました",
    error_load_moai: "moai の読み込みに失敗しました",
    error_load_drift: "drift の読み込みに失敗しました",
    error_load_moai_links: "moai link の読み込みに失敗しました",
    error_load_narrative: "ナラティブの読み込みに失敗しました",
    moai_search: "moai を検索",

    /* イベント通知 */
    event_reloaded: "ストーリーを再読み込みしました",
    event_reload_failed: "ストーリーの再読み込みに失敗しました",
    event_dismiss: "閉じる",

    /* 設定 */
    settings_title: "設定",
    settings_language: "言語",
    settings_mcp_status: "MCP サーバー",
    settings_mcp_hint:
      "MCP サーバーは Agent（Claude Code、Codex など）が自動的に起動・停止します。デスクトップアプリは関与しません。セットアップ方法はドキュメントをご覧ください。",
    settings_mcp_docs: "MCP 設定ドキュメントを開く",
    settings_done: "完了",

    /* クイックスイッチャー */
    switch_title: "ストーリーを切り替え",
    switch_placeholder: "最近開いたストーリーを検索…",
    switch_empty: "最近開いたストーリーはありません",
    switch_no_match: "一致するストーリーがありません",

    /* エラーメッセージ */
    FILE_NOT_FOUND: "ファイルが見つかりません",
    FILE_READ_FAILED: "ストーリーファイルの読み込みに失敗しました",
    DOCUMENT_PARSE_FAILED: "ストーリーファイルの解析に失敗しました",
    SCHEMA_INVALID: "ストーリー構造が無効です",
    REFERENCE_NOT_FOUND: "参照が見つかりません",
    PLUGIN_FAILED: "プラグインが失敗しました",
    STORY_NOT_LOADED: "ストーリーが読み込まれていません",

    /* ヒント */
    STORY_NOT_LOADED_HINT:
      "先にデスクトップアプリで WEFT ストーリーファイルを開いてください",

    /* ナビゲーション */
    nav_story: "ストーリー",
    nav_moai: "モアイ",
    nav_moai_link: "リンク",
    nav_drift: "ドリフト",
    nav_narrative: "ナラティブ",

    /* ストーリーページ */
    story_calendar: "カレンダー",
    story_builtin: "内蔵",
    story_plugin: "プラグイン",
    story_mode: "モード",

    /* モアイページ */
    moai_title: "モアイ",
    moai_materials: "素材",
    moai_timeline: "タイムライン",
    moai_count: "{n}/{t} モアイ",
    moai_events_empty: "まだドリフトイベントはありません。",
    moai_event_count: "{n} イベント",
    moai_event_count_plural: "{n} イベント",
    moai_search_empty: '"{q}" に一致するモアイはありません。',
    moai_empty: "モアイが見つかりません。",

    /* リレーショングラフページ */
    graph_title: "関係",
    graph_subtitle: "関係タイプを選択して、モアイ間のつながりを表示・探索します。",
    graph_search_placeholder: "ノードを検索",
    graph_zoom_out: "縮小",
    graph_zoom_in: "拡大",
    graph_fit_view: "表示に合わせる",
    graph_reset_view: "表示をリセット",
    graph_canvas_hint: "キャンバスをドラッグ · Ctrl/⌘ + スクロールでズーム",
    graph_close_detail: "ノード詳細を閉じる",
    graph_type_aria: "関係タイプ",
    graph_node_count: "{n} ノード · {l} リンク",
    graph_view_node: "{name} を表示",
    link_empty: "モアイリンクが見つかりません。",

    /* ドリフトページ */
    drift_title: "ドリフト",
    drift_empty: "ドリフトイベントが見つかりません。",
    drift_count: "全 {s} シーズン {n} イベント",

    /* ガント */
    gantt_event: "イベント",
    gantt_duration: "期間",
    gantt_milestone: "マイルストーン",

    /* イベントカード */
    event_no_base_time: "基準時間なし",

    /* ナラティブページ */
    narrative_title: "ナラティブ",
    narrative_empty: "ナラティブタイムラインが見つかりません。",
    narrative_count: "全 {s} ナラティブ {n} イベント",
    narrative_observer: "観察者: {o} · 主題: {t}",
  },

  eo: {
    /* Ĉefpaĝo */
    landing_title: "Malfermi WEFT-rakonton",
    landing_description:
      "Elektu YAML-dosieron por esplori ĝian rakonton, moai-ojn, drift-ojn, kaj narrativan templinion.",
    landing_formats: "Subtenas .yaml kaj .yml dosierojn",
    landing_choose: "Elekti YAML-dosieron",
    landing_opening: "Malfermante…",
    landing_recent: "Lastatempaj rakontoj",
    landing_no_recent: "Neniuj lastatempaj rakontoj ankoraŭ",
    landing_open_failed: "Malfermo malsukcesis",
    landing_file_lost_title: "La nuna rakontodosiero mankas",
    landing_file_lost_hint:
      "Ĝi eble estis movita aŭ forigita ekster WEFT. Kontrolu en via dosieradministrilo kaj repoziciigu.",
    landing_locate: "Repoziicii…",
    landing_close_story: "Fermi rakonton",
    landing_watching: "Observas dosierŝanĝojn",
    landing_invalid_drop: "Nur .yaml aŭ .yml dosieroj estas subtenataj",
    landing_drop_to_open: "Liberigu por malfermi ĉi tiun YAML",

    /* Paĝa stato */
    page_loading: "Ŝarĝante",
    page_retry: "Reprovi",
    page_error_default: "Malsukcesis ŝarĝi ĉi tiun paĝon",
    page_error_render: "Malsukcesis bildigi ĉi tiun paĝon",
    error_load_story: "Malsukcesis ŝarĝi rakonton",
    error_load_moai: "Malsukcesis ŝarĝi moai-ojn",
    error_load_drift: "Malsukcesis ŝarĝi drift-ojn",
    error_load_moai_links: "Malsukcesis ŝarĝi moai-ligojn",
    error_load_narrative: "Malsukcesis ŝarĝi rakontaron",
    moai_search: "Serĉi moai-ojn",

    /* Eventoj */
    event_reloaded: "Rakonto reŝarĝita je",
    event_reload_failed: "Rakonto reŝarĝo malsukcesis",
    event_dismiss: "Forigi",

    /* Agordoj */
    settings_title: "Agordoj",
    settings_language: "Lingvo",
    settings_mcp_status: "MCP-servilo",
    settings_mcp_hint:
      "La MCP-servilo estas lanĉita kaj haltigita de via Agento (Claude Code, Codex, …); la labortabla aplikaĵo ne partoprenas. Vidu la dokumentaron por agordo.",
    settings_mcp_docs: "Malfermi MCP-agordodokumentaron",
    settings_done: "Bone",

    /* Rapida ŝaltilo */
    switch_title: "Ŝalti rakonton",
    switch_placeholder: "Serĉi lastatempajn rakontojn…",
    switch_empty: "Neniuj lastatempaj rakontoj ankoraŭ",
    switch_no_match: "Neniu kongrua rakonto",

    /* Erarmesaĝoj */
    FILE_NOT_FOUND: "Dosiero ne trovita",
    FILE_READ_FAILED: "Malsukcesis legi rakontodosieron",
    DOCUMENT_PARSE_FAILED: "Malsukcesis analizi rakontodosieron",
    SCHEMA_INVALID: "Nevalida rakontostrukturo",
    REFERENCE_NOT_FOUND: "Referenco ne trovita",
    PLUGIN_FAILED: "Kromaĵo malsukcesis",
    STORY_NOT_LOADED: "Neniu rakonto ŝarĝita",

    /* Konsiloj */
    STORY_NOT_LOADED_HINT:
      "Unue malfermu WEFT-rakontodosieron en la labortabla aplikaĵo",

    /* Navigado */
    nav_story: "Rakonto",
    nav_moai: "Moai",
    nav_moai_link: "Ligoj",
    nav_drift: "Drift",
    nav_narrative: "Rakontaro",

    /* Rakonta paĝo */
    story_calendar: "Kalendaro",
    story_builtin: "Enkonstruita",
    story_plugin: "Kromaĵo",
    story_mode: "Reĝimo",

    /* Moai paĝo */
    moai_title: "Moai",
    moai_materials: "Materialoj",
    moai_timeline: "Templinio",
    moai_count: "{n} el {t} moai-oj",
    moai_events_empty: "Neniuj drift-eventoj ankoraŭ.",
    moai_event_count: "{n} evento",
    moai_event_count_plural: "{n} eventoj",
    moai_search_empty: 'Neniu moai trovita por "{q}".',
    moai_empty: "Neniu moai trovita.",

    /* Grafika paĝo de ligoj */
    graph_title: "Rilatoj",
    graph_subtitle: "Elektu rilatan tipon por vidi kaj esplori konektojn inter moai-oj.",
    graph_search_placeholder: "Serĉi nodojn",
    graph_zoom_out: "Malzomi",
    graph_zoom_in: "Zomi",
    graph_fit_view: "Konformigi",
    graph_reset_view: "Restarigi",
    graph_canvas_hint: "Treni kanvason · Ctrl/⌘ + rulumi por zomi",
    graph_close_detail: "Fermi nod-detalojn",
    graph_type_aria: "Rilata tipo",
    graph_node_count: "{n} nodoj · {l} ligoj",
    graph_view_node: "Vidi {name}",
    link_empty: "Neniuj moai-ligoj trovitaj.",

    /* Drift paĝo */
    drift_title: "Drift",
    drift_empty: "Neniuj drift-eventoj trovitaj.",
    drift_count: "{n} eventoj tra {s} sezonoj",

    /* Gantt */
    gantt_event: "Evento",
    gantt_duration: "Daŭro",
    gantt_milestone: "Mejloŝtono",

    /* Event-karto */
    event_no_base_time: "Neniu baza tempo",

    /* Rakontara paĝo */
    narrative_title: "Rakontaro",
    narrative_empty: "Neniuj rakontaraj templinioj trovitaj.",
    narrative_count: "{n} eventoj tra {s} rakontaroj",
    narrative_observer: "Observanto: {o} · Temoj: {t}",
  },

  en: {
    /* Landing */
    landing_title: "Open a WEFT story",
    landing_description:
      "Choose a YAML file to explore its story, moai, drifts, and narrative timeline.",
    landing_formats: "Supports .yaml and .yml files",
    landing_choose: "Choose YAML file",
    landing_opening: "Opening…",
    landing_recent: "Recent stories",
    landing_no_recent: "No recently opened stories yet",
    landing_open_failed: "Failed to open",
    landing_file_lost_title: "Current story file is missing",
    landing_file_lost_hint:
      "It may have been moved or deleted outside WEFT. Verify it in your file manager and re-locate.",
    landing_locate: "Locate…",
    landing_close_story: "Close story",
    landing_watching: "Watching file for changes",
    landing_invalid_drop: "Only .yaml or .yml files are supported",
    landing_drop_to_open: "Release to open this YAML",

    /* Page state */
    page_loading: "Loading",
    page_retry: "Retry",
    page_error_default: "Failed to load this page",
    page_error_render: "Failed to render this page",
    error_load_story: "Failed to load story",
    error_load_moai: "Failed to load moai",
    error_load_drift: "Failed to load drift",
    error_load_moai_links: "Failed to load moai links",
    error_load_narrative: "Failed to load narrative",
    moai_search: "Search moai",

    /* Events */
    event_reloaded: "Story reloaded at",
    event_reload_failed: "Story reload failed",
    event_dismiss: "Dismiss",

    /* Settings */
    settings_title: "Preferences",
    settings_language: "Language",
    settings_mcp_status: "MCP server",
    settings_mcp_hint:
      "The MCP server is spawned and stopped by your Agent (Claude Code, Codex, …); the desktop app is not involved. See the docs for setup.",
    settings_mcp_docs: "Open MCP setup docs",
    settings_done: "Done",

    /* Quick switcher */
    switch_title: "Switch story",
    switch_placeholder: "Search recent stories…",
    switch_empty: "No recently opened stories yet",
    switch_no_match: "No matching story",

    /* Error messages */
    FILE_NOT_FOUND: "File not found",
    FILE_READ_FAILED: "Failed to read story file",
    DOCUMENT_PARSE_FAILED: "Failed to parse story file",
    SCHEMA_INVALID: "Invalid story structure",
    REFERENCE_NOT_FOUND: "Reference not found",
    PLUGIN_FAILED: "Plugin failed",
    STORY_NOT_LOADED: "No story loaded",

    /* Hints */
    STORY_NOT_LOADED_HINT: "Open a WEFT story file in the desktop app first",

    /* Navigation */
    nav_story: "Story",
    nav_moai: "Moai",
    nav_moai_link: "Link",
    nav_drift: "Drift",
    nav_narrative: "Narrative",

    /* Story page */
    story_calendar: "Calendar",
    story_builtin: "Built-in",
    story_plugin: "Plugin",
    story_mode: "Mode",

    /* Moai page */
    moai_title: "Moai",
    moai_materials: "Materials",
    moai_timeline: "Timeline",
    moai_count: "{n} of {t} moais",
    moai_events_empty: "No drift events yet.",
    moai_event_count: "{n} event",
    moai_event_count_plural: "{n} events",
    moai_search_empty: 'No moai found for "{q}".',
    moai_empty: "No moai found.",

    /* Link graph page */
    graph_title: "Relationships",
    graph_subtitle: "Select a relationship type to view and explore connections between moai.",
    graph_search_placeholder: "Search nodes",
    graph_zoom_out: "Zoom out",
    graph_zoom_in: "Zoom in",
    graph_fit_view: "Fit view",
    graph_reset_view: "Reset view",
    graph_canvas_hint: "Drag canvas · Ctrl/⌘ + scroll to zoom",
    graph_close_detail: "Close node details",
    graph_type_aria: "Relationship type",
    graph_node_count: "{n} nodes · {l} links",
    graph_view_node: "View {name}",
    link_empty: "No moai links found.",

    /* Drift page */
    drift_title: "Drift",
    drift_empty: "No drift events found.",
    drift_count: "{n} events across {s} seasons",

    /* Gantt */
    gantt_event: "Event",
    gantt_duration: "Duration",
    gantt_milestone: "Milestone",

    /* Event hover card */
    event_no_base_time: "No base time",

    /* Narrative page */
    narrative_title: "Narrative",
    narrative_empty: "No narrative timelines found.",
    narrative_count: "{n} events across {s} narratives",
    narrative_observer: "Observer: {o} · Subjects: {t}",
  },
} as const;

export type Copy = (typeof COPY)[Language];

export function initialLanguage(): Language {
  const saved =
    typeof localStorage !== "undefined"
      ? localStorage.getItem(LANGUAGE_KEY)
      : null;
  if (
    saved === "zh-CN" ||
    saved === "zh-TW" ||
    saved === "lzh" ||
    saved === "en" ||
    saved === "ja" ||
    saved === "eo"
  )
    return saved;
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith("zh-TW") || lang.startsWith("zh-Hant")) return "zh-TW";
  if (lang.startsWith("zh")) return "zh-CN";
  if (lang.startsWith("ja")) return "ja";
  if (lang.startsWith("eo")) return "eo";
  return "en";
}

export function formatErrorMessage(
  lang: Language,
  error: { code: string; source?: string },
): string {
  const copy = COPY[lang];
  const msg =
    copy[error.code as keyof typeof copy] ?? error.code;
  if (typeof msg !== "string") return error.code;
  return error.source ? `${msg}: ${error.source}` : msg;
}

export function formatErrorHint(lang: Language, error: { code: string }): string | undefined {
  const hint = COPY[lang][`${error.code}_HINT` as keyof typeof COPY[typeof lang]];
  return typeof hint === "string" ? hint : undefined;
}
