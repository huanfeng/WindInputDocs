// 首页与下载页轮播的「使用技巧」文案。数据与展示分离：这里只有纯字符串，
// 组件（src/components/tip-ticker.tsx）负责随机、轮播与渲染。
//
// 加一条技巧 = 往 tips 里追加一项，不需要动组件。

export interface Tip {
  /** 稳定标识，作 React key，也方便日后做点击统计 */
  id: string;
  /**
   * 正文。反引号包裹的片段会渲染成 `<code>`，写法与 Markdown 一致：
   * "直接输入 `date`" → 直接输入 <code>date</code>
   */
  text: string;
  /** 「详情」链接的目标，务必指向真实存在的文档锚点 */
  href: string;
  /** 链接文案，尽量用该功能在文档里的正式名字，让人知道点过去会看到什么 */
  cta: string;
  /**
   * 赞助条：换图标与配色，并由组件随机安排到第 2～5 条（靠本字段定位，不靠下标，
   * 在数组里怎么挪都行——但**别放在第 0 项**，那是首帧占位）。整个数组只应有一条。
   */
  sponsor?: true;
}

/**
 * 顺序说明：**第 0 项是首帧占位，必须是一条普通技巧**。组件把它钉在序列首位、
 * 其余随机洗牌，于是静态 HTML 里渲染的永远是这条确定的内容，客户端接手时不会
 * 发生「服务端渲染 A、客户端随机成 B」的 hydration 不一致。
 *
 * 赞助条（`sponsor: true`）由组件随机插进第 2～5 位：进门第一眼是产品本身而不是
 * 要钱，但只要多看一会儿就必然经过它一次。它靠字段而非下标定位，可以随便挪。
 * 选 date 作门面是因为它对拼音和五笔用户都成立，且最容易让人「原来还能这样」。
 *
 * 其余各条的措辞刻意都是「痛点问句 + 一句话解法」：轮播位只有一行的注意力，
 * 先让人认出自己遇到过这个麻烦，才有点进文档的动机。
 *
 * **长度上限按视觉宽度算，不是按字符数。** 桌面端文本区 752px、字号 14px，一个
 * 中文字约 14px、半角字符约 7px，所以 `Ctrl + Shift + F11` 这样的长快捷键只值 9 个
 * 中文字。经验值：**纯中文不超过 34 字**，夹带半角内容可以更长（现有最长一条
 * 实测 469px，余量 38%）。
 *
 * 之所以要卡这条线：条目高度随内容变，一条两行、下一条一行，每次轮播都会把下方
 * 内容顶一下。拿不准就实测——把候选文案塞进轮播条，看它是否还是一行。
 * 细节留给文档，这里只负责让人认出痛点。
 */
export const tips: Tip[] = [
  {
    id: "date-phrase",
    text: "要打今天的日期？直接输入 `date`，另有 `time`、`week`。",
    href: "/docs/settings/dict/phrases#system-phrases",
    cta: "系统短语",
  },
  {
    id: "chaizi-tooltip",
    text: "不确定这个字怎么拆？开启悬停提示里的「拆字反查」即可看字根。",
    href: "/docs/settings/appearance#candidate-tooltip",
    cta: "拆字反查",
  },
  {
    id: "smart-symbol",
    text: "中英文标点切来切去？开启「智能符号模式」，同一标点连按两次即转英文。",
    href: "/docs/settings/input/punctuation#smart-symbol",
    cta: "智能符号",
  },
  {
    id: "pair-jump",
    text: "习惯打完括号按 `Tab` 跳出？跳出键可以改成 `Tab` 或回车。",
    href: "/docs/settings/input/punctuation#pair-jump",
    cta: "符号配对",
  },
  {
    id: "primary-pinyin",
    text: "临时拼音也想用双拼？把「主拼音方案」换成你惯用的双拼即可。",
    href: "/docs/settings/schema#main-schema",
    cta: "主方案设置",
  },
  {
    id: "app-initial-mode",
    text: "想让终端/桌面默认是英文？右键菜单 →「应用独立配置」。",
    href: "/docs/settings/menu#app-config",
    cta: "应用独立配置",
  },
  {
    id: "sponsor",
    text: "觉得清风输入法还不错？欢迎请开发者喝杯咖啡。",
    href: "/sponsor",
    cta: "支持项目",
    sponsor: true,
  },
  {
    id: "open-settings",
    text: "想快速打开设置？按 `Ctrl + Shift + ]`，或输入 `coss`。",
    href: "/docs/reference/hotkeys#function-keys",
    cta: "快捷键总表",
  },
  {
    id: "calc",
    text: "算个数还要开计算器？中文模式下打 `;1+2*3`，候选直接给出 `7`。",
    href: "/docs/settings/input/quick-input",
    cta: "快捷输入",
  },
  {
    id: "zz-symbols",
    text: "想要 →、±、①、㎏ 这类符号？`zz` 加分类缩写，`zzjt` 出箭头。",
    href: "/docs/settings/dict/phrases#zz-symbols",
    cta: "符号速查",
  },
  {
    id: "pinyin-tooltip",
    text: "形码打得出却不确定读音？鼠标悬停在候选项上就能看到拼音。",
    href: "/docs/settings/appearance#candidate-tooltip",
    cta: "候选项提示",
  },
  {
    id: "command-bar",
    text: "短语不止能出文本——命令直通车让 `cobd` 直接打开网页。",
    href: "/docs/guides/command-bar",
    cta: "命令直通车",
  },
  {
    id: "schema-hotkey",
    text: "在五笔和拼音之间来回切？给每个方案配一个直达热键，一步到位。",
    href: "/docs/settings/schema#schema-hotkey",
    cta: "方案直达热键",
  },
  {
    id: "screenshot",
    text: "想给候选窗留个截图？按 `Ctrl + Shift + F11`，或右键菜单 →「高级」。",
    href: "/docs/settings/keys#function-keys",
    cta: "界面截图",
  },
  {
    id: "mode-layout",
    text: "临时拼音、临时英文想要竖排候选？每个模式的布局都能单独设。",
    href: "/docs/settings/input/temp-modes#layout-modes",
    cta: "候选窗布局",
  },
  {
    id: "inline-code",
    text: "想快速切换嵌入编码模式？输入 `copm` 一键就能来回切。",
    href: "/docs/settings/appearance#layout-position",
    cta: "编码显示方式",
  },
  {
    id: "theme-style",
    text: "想固定用暗色主题？亮色、暗色、跟随系统三选一，右键菜单也能切。",
    href: "/docs/settings/appearance#theme",
    cta: "主题风格",
  },
  {
    id: "status-bubble",
    text: "不想每次切换都闪一下状态气泡？在设置里关掉「状态提示气泡」。",
    href: "/docs/settings/appearance#status-tip",
    cta: "状态提示",
  },
  {
    id: "add-word",
    text: "词库里没有的词？`Ctrl + =` 直接加，`Ctrl + Shift + =` 开加词面板。",
    href: "/docs/settings/keys#word-manage",
    cta: "快捷加词",
  },
  {
    id: "toolbar",
    text: "工具栏挡住视线？`Ctrl + Shift + \\` 一键收起，也能设成自动隐藏。",
    href: "/docs/settings/appearance#toolbar",
    cta: "工具栏",
  },
];
