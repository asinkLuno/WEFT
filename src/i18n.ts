import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
    'en-US': {
        translation: {
            home: {
                welcome: 'Welcome to',
                selectFile: 'Please select a YAML/YML file to begin',
                chooseFile: 'Choose YAML File',
                recentFiles: 'Recent Files',
                notice: 'Notice',
                timeWarning:
                    'Only supports dates from 271821 BC to 275760 AD, please handle time with care',
                fileLoadSuccess: 'File loaded successfully:',
                fileLoadError: 'Failed to load file:',
                noFileSelected: 'No file selected',
                fileSelectError: 'File selection error:',
                selectLanguage: 'Select language',
                failedToLoadStore: 'Failed to load store',
                languageChanged: 'Language changed to',
                failedToUpdateLocale: 'Failed to update locale',
                failedToUpdateRecentFiles: 'Failed to update recent files',
            },
            footer: {
                boundFile: 'Bound File',
                noFileBound: 'No File Bound',
                unbind: 'Unbind',
            },
            moai: {
                noData: 'No Moai available',
            },
            driftFlow: {
                noData: 'No DriftFlow available',
            },
            moaiFlow: {
                noData: 'No MoaiFlow available',
            },
            moaiLink: {
                noData: 'No MoaiLink available',
            },
            narrativeFlow: {
                noData: 'No NarrativeFlow available',
            },
            story: {
                noData: 'No Story available',
            },
            gantt: {
                noData: 'No data available to display',
                today: 'Today',
                controls: '↕️ Scroll | Shift+↕️ Pan horizontally | ↑↓ Zoom',
                participating: 'Participating',
            },
        },
    },
    'zh-CN': {
        translation: {
            home: {
                welcome: '欢迎使用',
                selectFile: '请选择一个YAML/YML文件开始操作',
                chooseFile: '选择YAML文件',
                recentFiles: '最近打开的文件',
                notice: '注意',
                timeWarning:
                    '仅支持公元前 271821 年至公元后 275760 年，请谨慎操控时间',
                fileLoadSuccess: '文件已成功加载：',
                fileLoadError: '文件加载失败：',
                noFileSelected: '未选择文件',
                fileSelectError: '文件选择错误：',
                selectLanguage: '选择语言',
                failedToLoadStore: '加载存储失败',
                languageChanged: '语言已更改为',
                failedToUpdateLocale: '更新语言设置失败',
                failedToUpdateRecentFiles: '更新最近文件列表失败',
            },
            footer: {
                boundFile: '绑定文件',
                noFileBound: '未绑定文件',
                unbind: '解除绑定',
            },
            moai: {
                noData: '暂无可用Moai',
            },
            driftFlow: {
                noData: '暂无可用DriftFlow',
            },
            moaiFlow: {
                noData: '暂无可用MoaiFlow',
            },
            moaiLink: {
                noData: '暂无可用MoaiLink',
            },
            narrativeFlow: {
                noData: '暂无可用NarrativeFlow',
            },
            story: {
                noData: '暂无可用Story',
            },
            gantt: {
                noData: '没有可显示的数据',
                today: '今天',
                controls: '↕️ 滚动 | Shift+↕️ 水平平移 | ↑↓ 缩放',
                participating: '参与',
            },
        },
    },
    'ja-JP': {
        translation: {
            home: {
                welcome: 'ようこそ',
                selectFile: '開始するには YAML/YML ファイルを選択してください',
                chooseFile: 'YAML ファイルを選択',
                recentFiles: '最近のファイル',
                notice: 'お知らせ',
                timeWarning:
                    '紀元前 271821 年から紀元後 275760 年までの日付のみをサポートしています。時間の扱いには注意してください',
                fileLoadSuccess: 'ファイルが正常に読み込まれました:',
                fileLoadError: 'ファイルの読み込みに失敗しました:',
                noFileSelected: 'ファイルが選択されていません',
                fileSelectError: 'ファイル選択エラー:',
                selectLanguage: '言語を選択',
                failedToLoadStore: 'ストアの読み込みに失敗しました',
                languageChanged: '言語が次に変更されました：',
                failedToUpdateLocale: 'ロケールの更新に失敗しました',
                failedToUpdateRecentFiles: '最近のファイルの更新に失敗しました',
            },
            footer: {
                boundFile: '紐付けられたファイル',
                noFileBound: 'ファイルが紐付けられていません',
                unbind: '紐付け解除',
            },
            moai: {
                noData: '利用可能な Moai がありません',
            },
            driftFlow: {
                noData: '利用可能な DriftFlow がありません',
            },
            moaiFlow: {
                noData: '利用可能な MoaiFlow がありません',
            },
            moaiLink: {
                noData: '利用可能な MoaiLink がありません',
            },
            narrativeFlow: {
                noData: '利用可能な NarrativeFlow がありません',
            },
            story: {
                noData: '利用可能な Story がありません',
            },
            gantt: {
                noData: '表示するデータがありません',
                today: '今日',
                controls: '↕️ スクロール | Shift+↕️ 水平移動 | ↑↓ ズーム',
                participating: '参加中',
            },
        },
    },
    'zh-Classical': {
        translation: {
            home: {
                welcome: '善哉，汝至矣',
                selectFile: '請擇一YAML/YML文牒以啓',
                chooseFile: '擇YAML文檔',
                recentFiles: '近所啓文牒',
                notice: '告',
                timeWarning:
                    '惟支自黃帝元年（西元前貳拾柒萬壹仟捌佰貳拾壹年）至西元貳拾柒萬伍仟柒佰陸拾年之曆，慎之哉',
                fileLoadSuccess: '文牒已載之矣：',
                fileLoadError: '文牒載之未成：',
                noFileSelected: '未擇文牒',
                fileSelectError: '擇文牒有誤：',
                selectLanguage: '擇語',
                failedToLoadStore: '載庫未成',
                languageChanged: '語已易爲',
                failedToUpdateLocale: '更語未成',
                failedToUpdateRecentFiles: '更近牒未成',
            },
            footer: {
                boundFile: '所繫文牒',
                noFileBound: '未繫文牒',
                unbind: '解繫',
            },
            moai: {
                noData: '無摩艾像可用',
            },
            driftFlow: {
                noData: '無漂移之流可用',
            },
            moaiFlow: {
                noData: '無摩艾之流可用',
            },
            moaiLink: {
                noData: '無摩艾之鏈可用',
            },
            narrativeFlow: {
                noData: '無敘事之流可用',
            },
            story: {
                noData: '無故事可用',
            },
            gantt: {
                noData: '無可示之數',
                today: '今日',
                controls: '↕️ 捲動 | Shift+↕️ 平移 | ↑↓ 縮放',
                participating: '與焉',
            },
        },
    },
};

i18n.use(initReactI18next).init({
    resources,
    fallbackLng: 'en',
    interpolation: {
        escapeValue: false,
    },
});

export default i18n;
