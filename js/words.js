// 中学生レベルの英単語データ（シーン別・100語）
// en: 英単語 / ja: 日本語訳 / pos: 品詞 / scene: シーン / example: 例文 / exampleJa: 例文の訳

// シーンの表示順（en はカードに表示する英語のラベル）
const SCENES = [
  { id: "学校", en: "School" },
  { id: "家・家族", en: "Home" },
  { id: "食べ物", en: "Food" },
  { id: "町・お出かけ", en: "Town" },
  { id: "自然・天気", en: "Nature" },
  { id: "気持ち・人", en: "People" },
  { id: "スポーツ・趣味", en: "Hobbies" },
  { id: "旅行・世界", en: "Travel" },
  { id: "時間・毎日", en: "Daily" },
  { id: "体・健康", en: "Body" },
];

const WORDS = [
  // ===== 学校 =====
  { scene: "学校", en: "school", ja: "学校", pos: "名詞", example: "I go to school by bike.", exampleJa: "私は自転車で学校に行きます。" },
  { scene: "学校", en: "teacher", ja: "先生", pos: "名詞", example: "Ms. Sato is our English teacher.", exampleJa: "佐藤先生は私たちの英語の先生です。" },
  { scene: "学校", en: "book", ja: "本", pos: "名詞", example: "This book is very interesting.", exampleJa: "この本はとてもおもしろい。" },
  { scene: "学校", en: "question", ja: "質問", pos: "名詞", example: "May I ask a question?", exampleJa: "質問してもいいですか？" },
  { scene: "学校", en: "library", ja: "図書館", pos: "名詞", example: "We studied in the library.", exampleJa: "私たちは図書館で勉強しました。" },
  { scene: "学校", en: "homework", ja: "宿題", pos: "名詞", example: "I have a lot of homework today.", exampleJa: "今日は宿題がたくさんあります。" },
  { scene: "学校", en: "study", ja: "勉強する", pos: "動詞", example: "I study English every day.", exampleJa: "私は毎日英語を勉強します。" },
  { scene: "学校", en: "write", ja: "書く", pos: "動詞", example: "Write your name here.", exampleJa: "ここにあなたの名前を書いてください。" },
  { scene: "学校", en: "understand", ja: "理解する", pos: "動詞", example: "I understand this lesson.", exampleJa: "私はこの授業がわかります。" },
  { scene: "学校", en: "difficult", ja: "難しい", pos: "形容詞", example: "This question is difficult.", exampleJa: "この問題は難しい。" },

  // ===== 家・家族 =====
  { scene: "家・家族", en: "family", ja: "家族", pos: "名詞", example: "There are five people in my family.", exampleJa: "私の家族は5人です。" },
  { scene: "家・家族", en: "house", ja: "家", pos: "名詞", example: "My house is near the river.", exampleJa: "私の家は川の近くにあります。" },
  { scene: "家・家族", en: "room", ja: "部屋", pos: "名詞", example: "My room is small but nice.", exampleJa: "私の部屋は小さいけれどすてきです。" },
  { scene: "家・家族", en: "kitchen", ja: "台所", pos: "名詞", example: "My mother is in the kitchen.", exampleJa: "母は台所にいます。" },
  { scene: "家・家族", en: "brother", ja: "兄、弟", pos: "名詞", example: "My brother is a high school student.", exampleJa: "私の兄は高校生です。" },
  { scene: "家・家族", en: "sister", ja: "姉、妹", pos: "名詞", example: "My sister likes cats.", exampleJa: "私の妹はねこが好きです。" },
  { scene: "家・家族", en: "grandmother", ja: "祖母", pos: "名詞", example: "I write a letter to my grandmother.", exampleJa: "私は祖母に手紙を書きます。" },
  { scene: "家・家族", en: "help", ja: "手伝う、助ける", pos: "動詞", example: "Can you help me?", exampleJa: "手伝ってくれますか？" },
  { scene: "家・家族", en: "clean", ja: "掃除する", pos: "動詞", example: "I clean my room on Sundays.", exampleJa: "私は日曜日に部屋を掃除します。" },
  { scene: "家・家族", en: "together", ja: "いっしょに", pos: "副詞", example: "We eat dinner together.", exampleJa: "私たちはいっしょに夕食を食べます。" },

  // ===== 食べ物 =====
  { scene: "食べ物", en: "apple", ja: "りんご", pos: "名詞", example: "I eat an apple every morning.", exampleJa: "私は毎朝りんごを食べます。" },
  { scene: "食べ物", en: "breakfast", ja: "朝食", pos: "名詞", example: "I had bread for breakfast.", exampleJa: "私は朝食にパンを食べました。" },
  { scene: "食べ物", en: "lunch", ja: "昼食", pos: "名詞", example: "Let's have lunch in the park.", exampleJa: "公園で昼食を食べよう。" },
  { scene: "食べ物", en: "dinner", ja: "夕食", pos: "名詞", example: "Dinner is ready.", exampleJa: "夕食の準備ができました。" },
  { scene: "食べ物", en: "vegetable", ja: "野菜", pos: "名詞", example: "You should eat more vegetables.", exampleJa: "あなたはもっと野菜を食べるべきです。" },
  { scene: "食べ物", en: "eat", ja: "食べる", pos: "動詞", example: "Let's eat lunch together.", exampleJa: "いっしょに昼食を食べよう。" },
  { scene: "食べ物", en: "drink", ja: "飲む", pos: "動詞", example: "I drink milk every morning.", exampleJa: "私は毎朝牛乳を飲みます。" },
  { scene: "食べ物", en: "cook", ja: "料理する", pos: "動詞", example: "My father cooks curry on Sundays.", exampleJa: "父は日曜日にカレーを作ります。" },
  { scene: "食べ物", en: "delicious", ja: "とてもおいしい", pos: "形容詞", example: "This cake is delicious.", exampleJa: "このケーキはとてもおいしい。" },
  { scene: "食べ物", en: "hungry", ja: "おなかがすいた", pos: "形容詞", example: "I'm hungry. Let's eat.", exampleJa: "おなかがすいた。食べよう。" },

  // ===== 町・お出かけ =====
  { scene: "町・お出かけ", en: "station", ja: "駅", pos: "名詞", example: "The station is near my house.", exampleJa: "駅は私の家の近くにあります。" },
  { scene: "町・お出かけ", en: "park", ja: "公園", pos: "名詞", example: "Children are playing in the park.", exampleJa: "子どもたちが公園で遊んでいます。" },
  { scene: "町・お出かけ", en: "hospital", ja: "病院", pos: "名詞", example: "The hospital is next to the bank.", exampleJa: "病院は銀行のとなりにあります。" },
  { scene: "町・お出かけ", en: "store", ja: "店", pos: "名詞", example: "This store opens at ten.", exampleJa: "この店は10時に開きます。" },
  { scene: "町・お出かけ", en: "museum", ja: "博物館、美術館", pos: "名詞", example: "We visited the museum.", exampleJa: "私たちは博物館を訪れました。" },
  { scene: "町・お出かけ", en: "go", ja: "行く", pos: "動詞", example: "I want to go to Kyoto.", exampleJa: "私は京都に行きたい。" },
  { scene: "町・お出かけ", en: "come", ja: "来る", pos: "動詞", example: "Please come to my house.", exampleJa: "私の家に来てください。" },
  { scene: "町・お出かけ", en: "buy", ja: "買う", pos: "動詞", example: "I bought a new bag yesterday.", exampleJa: "私は昨日新しいかばんを買いました。" },
  { scene: "町・お出かけ", en: "visit", ja: "訪れる", pos: "動詞", example: "I will visit my uncle next week.", exampleJa: "私は来週おじを訪ねます。" },
  { scene: "町・お出かけ", en: "near", ja: "近くに", pos: "前置詞", example: "Is there a bus stop near here?", exampleJa: "この近くにバス停はありますか？" },

  // ===== 自然・天気 =====
  { scene: "自然・天気", en: "weather", ja: "天気", pos: "名詞", example: "The weather is nice today.", exampleJa: "今日は天気がいい。" },
  { scene: "自然・天気", en: "rain", ja: "雨", pos: "名詞", example: "We had a lot of rain this week.", exampleJa: "今週はたくさん雨が降りました。" },
  { scene: "自然・天気", en: "snow", ja: "雪", pos: "名詞", example: "There is a lot of snow in Hokkaido.", exampleJa: "北海道にはたくさんの雪があります。" },
  { scene: "自然・天気", en: "sky", ja: "空", pos: "名詞", example: "The sky is blue.", exampleJa: "空が青い。" },
  { scene: "自然・天気", en: "mountain", ja: "山", pos: "名詞", example: "We climbed the mountain.", exampleJa: "私たちはその山に登りました。" },
  { scene: "自然・天気", en: "river", ja: "川", pos: "名詞", example: "This river is very long.", exampleJa: "この川はとても長い。" },
  { scene: "自然・天気", en: "flower", ja: "花", pos: "名詞", example: "She gave me some flowers.", exampleJa: "彼女は私に花をくれました。" },
  { scene: "自然・天気", en: "hot", ja: "暑い、熱い", pos: "形容詞", example: "It is very hot today.", exampleJa: "今日はとても暑い。" },
  { scene: "自然・天気", en: "cold", ja: "寒い、冷たい", pos: "形容詞", example: "It was cold this morning.", exampleJa: "今朝は寒かった。" },
  { scene: "自然・天気", en: "beautiful", ja: "美しい", pos: "形容詞", example: "The flowers are beautiful.", exampleJa: "その花は美しい。" },

  // ===== 気持ち・人 =====
  { scene: "気持ち・人", en: "friend", ja: "友だち", pos: "名詞", example: "She is my best friend.", exampleJa: "彼女は私の親友です。" },
  { scene: "気持ち・人", en: "dream", ja: "夢", pos: "名詞", example: "My dream is to be a doctor.", exampleJa: "私の夢は医者になることです。" },
  { scene: "気持ち・人", en: "happy", ja: "幸せな、うれしい", pos: "形容詞", example: "I am happy to see you.", exampleJa: "あなたに会えてうれしい。" },
  { scene: "気持ち・人", en: "sad", ja: "悲しい", pos: "形容詞", example: "I was sad to hear the news.", exampleJa: "その知らせを聞いて悲しかった。" },
  { scene: "気持ち・人", en: "kind", ja: "親切な", pos: "形容詞", example: "Thank you. You are very kind.", exampleJa: "ありがとう。とても親切ですね。" },
  { scene: "気持ち・人", en: "busy", ja: "忙しい", pos: "形容詞", example: "I am busy today.", exampleJa: "私は今日忙しい。" },
  { scene: "気持ち・人", en: "important", ja: "大切な", pos: "形容詞", example: "Friends are important to me.", exampleJa: "友だちは私にとって大切です。" },
  { scene: "気持ち・人", en: "different", ja: "違った、異なる", pos: "形容詞", example: "We have different ideas.", exampleJa: "私たちは異なる考えを持っています。" },
  { scene: "気持ち・人", en: "remember", ja: "覚えている、思い出す", pos: "動詞", example: "I remember his name.", exampleJa: "私は彼の名前を覚えています。" },
  { scene: "気持ち・人", en: "feel", ja: "感じる", pos: "動詞", example: "I feel happy when I sing.", exampleJa: "私は歌うと幸せな気持ちになります。" },

  // ===== スポーツ・趣味 =====
  { scene: "スポーツ・趣味", en: "play", ja: "（スポーツ・楽器を）する、遊ぶ", pos: "動詞", example: "I play soccer after school.", exampleJa: "私は放課後サッカーをします。" },
  { scene: "スポーツ・趣味", en: "listen", ja: "聞く", pos: "動詞", example: "I listen to music at night.", exampleJa: "私は夜に音楽を聞きます。" },
  { scene: "スポーツ・趣味", en: "read", ja: "読む", pos: "動詞", example: "I like to read comics.", exampleJa: "私はまんがを読むのが好きです。" },
  { scene: "スポーツ・趣味", en: "practice", ja: "練習する", pos: "動詞", example: "We practice tennis every day.", exampleJa: "私たちは毎日テニスを練習します。" },
  { scene: "スポーツ・趣味", en: "music", ja: "音楽", pos: "名詞", example: "What kind of music do you like?", exampleJa: "どんな音楽が好きですか？" },
  { scene: "スポーツ・趣味", en: "team", ja: "チーム", pos: "名詞", example: "Our team won the game.", exampleJa: "私たちのチームが試合に勝ちました。" },
  { scene: "スポーツ・趣味", en: "game", ja: "試合、ゲーム", pos: "名詞", example: "The game starts at three.", exampleJa: "試合は3時に始まります。" },
  { scene: "スポーツ・趣味", en: "picture", ja: "絵、写真", pos: "名詞", example: "He is good at drawing pictures.", exampleJa: "彼は絵を描くのが得意です。" },
  { scene: "スポーツ・趣味", en: "favorite", ja: "お気に入りの", pos: "形容詞", example: "My favorite sport is basketball.", exampleJa: "私のお気に入りのスポーツはバスケットボールです。" },
  { scene: "スポーツ・趣味", en: "popular", ja: "人気のある", pos: "形容詞", example: "This song is popular in Japan.", exampleJa: "この歌は日本で人気があります。" },

  // ===== 旅行・世界 =====
  { scene: "旅行・世界", en: "country", ja: "国", pos: "名詞", example: "Japan is a beautiful country.", exampleJa: "日本は美しい国です。" },
  { scene: "旅行・世界", en: "language", ja: "言語", pos: "名詞", example: "English is an international language.", exampleJa: "英語は国際的な言語です。" },
  { scene: "旅行・世界", en: "culture", ja: "文化", pos: "名詞", example: "I want to learn about Japanese culture.", exampleJa: "私は日本の文化について学びたい。" },
  { scene: "旅行・世界", en: "airport", ja: "空港", pos: "名詞", example: "We arrived at the airport at noon.", exampleJa: "私たちは正午に空港に着きました。" },
  { scene: "旅行・世界", en: "trip", ja: "旅行", pos: "名詞", example: "How was your trip?", exampleJa: "旅行はどうでしたか？" },
  { scene: "旅行・世界", en: "speak", ja: "話す", pos: "動詞", example: "Can you speak English?", exampleJa: "あなたは英語を話せますか？" },
  { scene: "旅行・世界", en: "travel", ja: "旅行する", pos: "動詞", example: "I want to travel around the world.", exampleJa: "私は世界中を旅行したい。" },
  { scene: "旅行・世界", en: "famous", ja: "有名な", pos: "形容詞", example: "Mt. Fuji is famous all over the world.", exampleJa: "富士山は世界中で有名です。" },
  { scene: "旅行・世界", en: "foreign", ja: "外国の", pos: "形容詞", example: "I have never been to a foreign country.", exampleJa: "私は外国に行ったことがありません。" },
  { scene: "旅行・世界", en: "abroad", ja: "外国に（で）", pos: "副詞", example: "I want to study abroad.", exampleJa: "私は留学したい。" },

  // ===== 時間・毎日 =====
  { scene: "時間・毎日", en: "morning", ja: "朝", pos: "名詞", example: "I get up at six in the morning.", exampleJa: "私は朝6時に起きます。" },
  { scene: "時間・毎日", en: "today", ja: "今日", pos: "名詞", example: "What day is it today?", exampleJa: "今日は何曜日ですか？" },
  { scene: "時間・毎日", en: "tomorrow", ja: "明日", pos: "名詞", example: "See you tomorrow.", exampleJa: "また明日。" },
  { scene: "時間・毎日", en: "week", ja: "週", pos: "名詞", example: "I play tennis twice a week.", exampleJa: "私は週に2回テニスをします。" },
  { scene: "時間・毎日", en: "use", ja: "使う", pos: "動詞", example: "May I use your pen?", exampleJa: "あなたのペンを使ってもいいですか？" },
  { scene: "時間・毎日", en: "always", ja: "いつも", pos: "副詞", example: "He is always kind to everyone.", exampleJa: "彼はいつもみんなに親切です。" },
  { scene: "時間・毎日", en: "often", ja: "よく、しばしば", pos: "副詞", example: "I often go to the park.", exampleJa: "私はよく公園に行きます。" },
  { scene: "時間・毎日", en: "sometimes", ja: "ときどき", pos: "副詞", example: "I sometimes cook dinner.", exampleJa: "私はときどき夕食を作ります。" },
  { scene: "時間・毎日", en: "usually", ja: "ふだんは、たいてい", pos: "副詞", example: "I usually walk to school.", exampleJa: "私はたいてい歩いて学校に行きます。" },
  { scene: "時間・毎日", en: "early", ja: "早く", pos: "副詞", example: "I got up early this morning.", exampleJa: "私は今朝早く起きました。" },

  // ===== 体・健康 =====
  { scene: "体・健康", en: "head", ja: "頭", pos: "名詞", example: "I have a headache. My head hurts.", exampleJa: "頭痛がします。頭が痛い。" },
  { scene: "体・健康", en: "hand", ja: "手", pos: "名詞", example: "Wash your hands before dinner.", exampleJa: "夕食の前に手を洗いなさい。" },
  { scene: "体・健康", en: "eye", ja: "目", pos: "名詞", example: "She has big eyes.", exampleJa: "彼女は大きな目をしています。" },
  { scene: "体・健康", en: "doctor", ja: "医者", pos: "名詞", example: "You should see a doctor.", exampleJa: "あなたは医者にみてもらうべきです。" },
  { scene: "体・健康", en: "sleep", ja: "眠る", pos: "動詞", example: "I sleep eight hours every night.", exampleJa: "私は毎晩8時間眠ります。" },
  { scene: "体・健康", en: "walk", ja: "歩く", pos: "動詞", example: "Let's walk to the station.", exampleJa: "駅まで歩こう。" },
  { scene: "体・健康", en: "run", ja: "走る", pos: "動詞", example: "He runs very fast.", exampleJa: "彼はとても速く走ります。" },
  { scene: "体・健康", en: "tired", ja: "疲れた", pos: "形容詞", example: "I was tired after the game.", exampleJa: "試合の後、私は疲れていました。" },
  { scene: "体・健康", en: "sick", ja: "病気の", pos: "形容詞", example: "She is sick in bed.", exampleJa: "彼女は病気で寝ています。" },
  { scene: "体・健康", en: "healthy", ja: "健康な", pos: "形容詞", example: "Eating vegetables keeps you healthy.", exampleJa: "野菜を食べると健康でいられます。" },
];
