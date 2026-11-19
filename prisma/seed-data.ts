// Demo menu for FoodHub. Prices are in whole KZT. Names/descriptions in kk / ru / en.
// This is sample data for a demo restaurant — not a real business, no real reviews or ratings.

export type L = [kk: string, ru: string, en: string];
export type SeedOption = { name: L; price: number };
export type SeedGroup = { name: L; min: number; max: number; options: SeedOption[] };
export type SeedVariant = { name: L; price: number; isDefault?: boolean };
export type SeedProduct = {
  slug: string;
  category: string;
  name: L;
  description: L;
  ingredients?: L;
  allergens?: string[];
  price: number;
  compareAtPrice?: number;
  weightGrams?: number;
  calories?: number;
  featured?: boolean;
  popularity?: number;
  available?: boolean;
  tags?: string[];
  variants?: SeedVariant[];
  groups?: SeedGroup[];
};

export const categories: { slug: string; name: L; image: string }[] = [
  { slug: "burgers", name: ["Бургерлер", "Бургеры", "Burgers"], image: "/images/products/black-angus-burger.jpg" },
  { slug: "pizza", name: ["Пицца", "Пицца", "Pizza"], image: "/images/products/pizza-margherita.jpg" },
  { slug: "sushi", name: ["Суши және роллдар", "Суши и роллы", "Sushi & Rolls"], image: "/images/products/philadelphia-roll.jpg" },
  { slug: "sides", name: ["Тіскебасарлар", "Закуски", "Sides & Snacks"], image: "/images/products/french-fries.jpg" },
  { slug: "salads", name: ["Салаттар", "Салаты", "Salads & Bowls"], image: "/images/products/green-bowl.jpg" },
  { slug: "drinks", name: ["Сусындар", "Напитки", "Drinks"], image: "/images/products/iced-latte.jpg" },
  { slug: "desserts", name: ["Десерттер", "Десерты", "Desserts"], image: "/images/products/chocolate-cake.jpg" },
];

const burgerSauce: SeedGroup = {
  name: ["Тұздық", "Соус", "Sauce"],
  min: 1,
  max: 1,
  options: [
    { name: ["Фирмалық тұздық", "Фирменный соус", "House sauce"], price: 0 },
    { name: ["BBQ тұздығы", "Соус BBQ", "BBQ sauce"], price: 0 },
    { name: ["Сарымсақ тұздығы", "Чесночный соус", "Garlic sauce"], price: 0 },
    { name: ["Ащы тұздық", "Острый соус", "Spicy sauce"], price: 0 },
  ],
};

const burgerExtras: SeedGroup = {
  name: ["Қосымшалар", "Добавки", "Extras"],
  min: 0,
  max: 4,
  options: [
    { name: ["Қосымша чеддер", "Доп. чеддер", "Extra cheddar"], price: 300 },
    { name: ["Бекон", "Бекон", "Bacon"], price: 450 },
    { name: ["Халапеньо", "Халапеньо", "Jalapeño"], price: 200 },
    { name: ["Қосымша котлет", "Доп. котлета", "Extra patty"], price: 990 },
  ],
};

const pizzaSizes = (small: number, large: number): SeedVariant[] => [
  { name: ["30 см", "30 см", "30 cm"], price: small, isDefault: true },
  { name: ["40 см", "40 см", "40 cm"], price: large },
];

const pizzaCrust: SeedGroup = {
  name: ["Қамыр", "Тесто", "Crust"],
  min: 1,
  max: 1,
  options: [
    { name: ["Классикалық", "Классическое", "Classic"], price: 0 },
    { name: ["Жұқа", "Тонкое", "Thin"], price: 0 },
    { name: ["Ірімшік жиегі", "Сырный бортик", "Cheese-stuffed crust"], price: 690 },
  ],
};

const pizzaExtras: SeedGroup = {
  name: ["Қосымшалар", "Добавки", "Extra toppings"],
  min: 0,
  max: 3,
  options: [
    { name: ["Моцарелла", "Моцарелла", "Mozzarella"], price: 400 },
    { name: ["Саңырауқұлақ", "Грибы", "Mushrooms"], price: 300 },
    { name: ["Халапеньо", "Халапеньо", "Jalapeño"], price: 200 },
  ],
};

const sushiExtras: SeedGroup = {
  name: ["Қосымшалар", "Добавки", "Add-ons"],
  min: 0,
  max: 3,
  options: [
    { name: ["Қосымша имбирь", "Доп. имбирь", "Extra ginger"], price: 150 },
    { name: ["Қосымша васаби", "Доп. васаби", "Extra wasabi"], price: 150 },
    { name: ["Спайси тұздық", "Спайси соус", "Spicy mayo"], price: 250 },
  ],
};

const dipSauces: SeedGroup = {
  name: ["Тұздықтар", "Соусы", "Dips"],
  min: 0,
  max: 2,
  options: [
    { name: ["Кетчуп", "Кетчуп", "Ketchup"], price: 150 },
    { name: ["Ірімшік тұздығы", "Сырный соус", "Cheese dip"], price: 250 },
    { name: ["Сарымсақ тұздығы", "Чесночный соус", "Garlic dip"], price: 200 },
  ],
};

const drinkSizes = (s: number, l: number): SeedVariant[] => [
  { name: ["0,3 л", "0,3 л", "0.3 L"], price: s, isDefault: true },
  { name: ["0,5 л", "0,5 л", "0.5 L"], price: l },
];

export const products: SeedProduct[] = [
  // ---------- Burgers ----------
  {
    slug: "black-angus-burger",
    category: "burgers",
    name: ["Блэк Ангус бургері", "Бургер Блэк Ангус", "Black Angus Burger"],
    description: [
      "Ангус сиыр етінен жасалған шырынды котлет, қытырлақ бекон, піскен қызанақ, балғын салат және кунжутты жұмсақ бриошь.",
      "Сочная котлета из говядины ангус, хрустящий бекон, спелый томат, свежий салат и мягкая бриошь с кунжутом.",
      "A juicy Angus beef patty with crispy bacon, ripe tomato, fresh lettuce and a soft sesame brioche bun.",
    ],
    ingredients: [
      "Бриошь, ангус сиыр еті 180 г, бекон, чеддер, қызанақ, пияз, қияр тұздығы, салат",
      "Бриошь, говядина ангус 180 г, бекон, чеддер, томат, лук, маринованные огурцы, салат",
      "Brioche bun, 180 g Angus beef, bacon, cheddar, tomato, onion, pickles, lettuce",
    ],
    allergens: ["gluten", "milk", "sesame", "egg"],
    price: 3690,
    weightGrams: 380,
    calories: 820,
    featured: true,
    popularity: 98,
    tags: ["bestseller"],
    groups: [burgerSauce, burgerExtras],
  },
  {
    slug: "smoky-steakhouse-burger",
    category: "burgers",
    name: ["Смоки стейкхаус", "Смоки стейкхаус", "Smoky Steakhouse"],
    description: [
      "Екі котлет, ерітілген чеддер және ысталған фирмалық тұздық. Нағыз ет сүйетіндерге арналған.",
      "Две котлеты, расплавленный чеддер и фирменный копчёный соус. Для настоящих любителей мяса.",
      "Two patties, melted cheddar and our smoky house sauce. Made for serious meat lovers.",
    ],
    ingredients: [
      "Бриошь, екі котлет 2×120 г, чеддер, ысталған тұздық, қияр, пияз",
      "Бриошь, две котлеты 2×120 г, чеддер, копчёный соус, огурцы, лук",
      "Brioche, 2×120 g beef patties, cheddar, smoky sauce, pickles, onion",
    ],
    allergens: ["gluten", "milk", "egg"],
    price: 3990,
    weightGrams: 420,
    calories: 960,
    featured: true,
    popularity: 91,
    groups: [burgerSauce, burgerExtras],
  },
  {
    slug: "double-cheeseburger",
    category: "burgers",
    name: ["Қос чизбургер", "Двойной чизбургер", "Double Cheeseburger"],
    description: [
      "Карамельденген пияз, екі қабат чеддер және қара кунжутты тоқаш.",
      "Карамелизированный лук, два слоя чеддера и булочка с чёрным кунжутом.",
      "Caramelised onions, double cheddar and a black sesame bun.",
    ],
    allergens: ["gluten", "milk", "sesame"],
    price: 3490,
    weightGrams: 360,
    calories: 880,
    featured: true,
    popularity: 87,
    groups: [burgerSauce, burgerExtras],
  },
  {
    slug: "bbq-bacon-burger",
    category: "burgers",
    name: ["BBQ бекон бургері", "BBQ бекон бургер", "BBQ Bacon Burger"],
    description: [
      "Үш котлет, пастрома, бекон және BBQ тұздығы — ең үлкен бургеріміз.",
      "Три котлеты, пастрома, бекон и соус BBQ — наш самый большой бургер.",
      "Three patties, pastrami, bacon and BBQ sauce — our biggest burger.",
    ],
    allergens: ["gluten", "milk"],
    price: 4590,
    weightGrams: 520,
    calories: 1240,
    popularity: 74,
    tags: ["spicy"],
    groups: [burgerExtras],
  },
  {
    slug: "classic-beef-burger",
    category: "burgers",
    name: ["Классикалық бургер", "Классический бургер", "Classic Beef Burger"],
    description: [
      "Сиыр етінен котлет, чеддер, қызанақ, салат және фирмалық тұздық. Уақыт сынынан өткен дәм.",
      "Говяжья котлета, чеддер, томат, салат и фирменный соус. Проверенная временем классика.",
      "Beef patty, cheddar, tomato, lettuce and house sauce. A timeless classic.",
    ],
    allergens: ["gluten", "milk", "egg"],
    price: 2690,
    weightGrams: 300,
    calories: 640,
    popularity: 80,
    groups: [burgerSauce, burgerExtras],
  },
  {
    slug: "cheddar-melt-burger",
    category: "burgers",
    name: ["Чеддер мелт", "Чеддер мелт", "Cheddar Melt"],
    description: [
      "Ерітілген чеддер мен қуырылған жұмыртқасы бар шырынды бургер.",
      "Сочный бургер с расплавленным чеддером и яичницей.",
      "A juicy burger with melted cheddar and a fried egg.",
    ],
    allergens: ["gluten", "milk", "egg"],
    price: 3190,
    weightGrams: 340,
    calories: 760,
    popularity: 63,
    groups: [burgerSauce, burgerExtras],
  },
  {
    slug: "burger-combo",
    category: "burgers",
    name: ["Бургер комбо", "Бургер комбо", "Burger Combo"],
    description: [
      "Классикалық бургер, фри картобы және тұздық — бір бағамен.",
      "Классический бургер, картофель фри и соус — по одной цене.",
      "Classic burger, fries and a dip — one price.",
    ],
    allergens: ["gluten", "milk", "egg"],
    price: 3490,
    compareAtPrice: 3990,
    weightGrams: 480,
    calories: 1020,
    featured: true,
    popularity: 85,
    tags: ["combo"],
    groups: [burgerSauce, dipSauces],
  },

  // ---------- Pizza ----------
  {
    slug: "pizza-margherita",
    category: "pizza",
    name: ["Маргарита", "Маргарита", "Margherita"],
    description: [
      "Томат тұздығы, моцарелла және жаңа райхан. Итальяндық классика.",
      "Томатный соус, моцарелла и свежий базилик. Итальянская классика.",
      "Tomato sauce, mozzarella and fresh basil. The Italian classic.",
    ],
    allergens: ["gluten", "milk"],
    price: 2990,
    calories: 780,
    featured: true,
    popularity: 82,
    tags: ["vegetarian"],
    variants: pizzaSizes(2990, 4290),
    groups: [pizzaCrust, pizzaExtras],
  },
  {
    slug: "pizza-pepperoni",
    category: "pizza",
    name: ["Пепперони", "Пепперони", "Pepperoni"],
    description: [
      "Ащылау пепперони шұжығы және созылмалы моцарелла.",
      "Пикантная колбаса пепперони и тянущаяся моцарелла.",
      "Spicy pepperoni and stretchy mozzarella.",
    ],
    allergens: ["gluten", "milk"],
    price: 3490,
    calories: 920,
    featured: true,
    popularity: 95,
    tags: ["bestseller", "spicy"],
    variants: pizzaSizes(3490, 4990),
    groups: [pizzaCrust, pizzaExtras],
  },
  {
    slug: "pizza-four-cheese",
    category: "pizza",
    name: ["Төрт ірімшік", "Четыре сыра", "Four Cheese"],
    description: [
      "Моцарелла, пармезан, горгонзола және чеддер — кремді әрі хош иісті.",
      "Моцарелла, пармезан, горгонзола и чеддер — сливочно и ароматно.",
      "Mozzarella, parmesan, gorgonzola and cheddar — creamy and aromatic.",
    ],
    allergens: ["gluten", "milk"],
    price: 3690,
    calories: 980,
    popularity: 70,
    tags: ["vegetarian"],
    variants: pizzaSizes(3690, 5190),
    groups: [pizzaCrust, pizzaExtras],
  },
  {
    slug: "pizza-vegetarian",
    category: "pizza",
    name: ["Вегетариандық", "Вегетарианская", "Vegetarian"],
    description: [
      "Болгар бұрышы, зәйтүн, қызанақ, саңырауқұлақ және моцарелла.",
      "Болгарский перец, оливки, томаты, грибы и моцарелла.",
      "Bell peppers, olives, tomatoes, mushrooms and mozzarella.",
    ],
    allergens: ["gluten", "milk"],
    price: 3190,
    calories: 720,
    popularity: 52,
    tags: ["vegetarian"],
    variants: pizzaSizes(3190, 4590),
    groups: [pizzaCrust, pizzaExtras],
  },
  {
    slug: "pizza-spinach-feta",
    category: "pizza",
    name: ["Шпинат пен фета", "Шпинат и фета", "Spinach & Feta"],
    description: [
      "Балғын шпинат, фета ірімшігі, сарымсақ майы және моцарелла.",
      "Свежий шпинат, фета, чесночное масло и моцарелла.",
      "Fresh spinach, feta, garlic oil and mozzarella.",
    ],
    allergens: ["gluten", "milk"],
    price: 3390,
    calories: 760,
    popularity: 44,
    tags: ["vegetarian"],
    variants: pizzaSizes(3390, 4790),
    groups: [pizzaCrust, pizzaExtras],
  },

  // ---------- Sushi ----------
  {
    slug: "philadelphia-roll",
    category: "sushi",
    name: ["Филадельфия ролл", "Ролл Филадельфия", "Philadelphia Roll"],
    description: [
      "Жеңіл тұздалған лосось, кремді ірімшік және қияр. 8 дана.",
      "Слабосолёный лосось, сливочный сыр и огурец. 8 штук.",
      "Lightly salted salmon, cream cheese and cucumber. 8 pieces.",
    ],
    allergens: ["fish", "milk", "soy", "sesame"],
    price: 3990,
    weightGrams: 260,
    featured: true,
    popularity: 90,
    tags: ["bestseller"],
    groups: [sushiExtras],
  },
  {
    slug: "nigiri-set",
    category: "sushi",
    name: ["Нигири сеті", "Сет нигири", "Nigiri Set"],
    description: [
      "Лосось, тунец және теңіз шаяны қосылған 8 нигири.",
      "8 нигири с лососем, тунцом и креветкой.",
      "8 nigiri with salmon, tuna and shrimp.",
    ],
    allergens: ["fish", "crustaceans", "soy"],
    price: 4490,
    weightGrams: 240,
    popularity: 58,
    groups: [sushiExtras],
  },
  {
    slug: "chef-sushi-set",
    category: "sushi",
    name: ["Аспаз сеті", "Сет от шефа", "Chef's Set"],
    description: [
      "Роллдар мен нигиридің аспаз таңдаған ассортименті. 24 дана, 2–3 адамға.",
      "Ассорти роллов и нигири от шефа. 24 штуки, на 2–3 персоны.",
      "A chef-selected assortment of rolls and nigiri. 24 pieces, serves 2–3.",
    ],
    allergens: ["fish", "crustaceans", "milk", "soy", "sesame"],
    price: 9990,
    compareAtPrice: 11490,
    weightGrams: 780,
    featured: true,
    popularity: 66,
    groups: [sushiExtras],
  },
  {
    slug: "party-sushi-set",
    category: "sushi",
    name: ["Той сеті", "Сет для вечеринки", "Party Set"],
    description: [
      "Үлкен компанияға арналған 48 дана ролл.",
      "48 роллов для большой компании.",
      "48 rolls for a big group.",
    ],
    allergens: ["fish", "crustaceans", "milk", "soy", "sesame"],
    price: 16990,
    weightGrams: 1500,
    popularity: 40,
    groups: [sushiExtras],
  },
  {
    slug: "salmon-tartare",
    category: "sushi",
    name: ["Лосось тартары", "Тартар из лосося", "Salmon Tartare"],
    description: [
      "Авокадо, уылдырық және цитрус тұздығы қосылған лосось тартары.",
      "Тартар из лосося с авокадо, икрой и цитрусовой заправкой.",
      "Salmon tartare with avocado, roe and a citrus dressing.",
    ],
    allergens: ["fish", "soy"],
    price: 3790,
    weightGrams: 180,
    popularity: 35,
  },

  // ---------- Sides ----------
  {
    slug: "french-fries",
    category: "sides",
    name: ["Фри картобы", "Картофель фри", "French Fries"],
    description: [
      "Теңіз тұзы қосылған алтын түсті қытырлақ картоп.",
      "Золотистый хрустящий картофель с морской солью.",
      "Golden, crispy fries with sea salt.",
    ],
    price: 990,
    popularity: 88,
    tags: ["vegetarian"],
    variants: [
      { name: ["Кіші", "Маленький", "Small"], price: 790 },
      { name: ["Орташа", "Средний", "Medium"], price: 990, isDefault: true },
      { name: ["Үлкен", "Большой", "Large"], price: 1290 },
    ],
    groups: [dipSauces],
  },
  {
    slug: "buffalo-wings",
    category: "sides",
    name: ["Буффало қанаттары", "Крылья Буффало", "Buffalo Wings"],
    description: [
      "Ащы буффало тұздығындағы тауық қанаттары.",
      "Куриные крылья в остром соусе буффало.",
      "Chicken wings tossed in spicy buffalo sauce.",
    ],
    allergens: ["milk"],
    price: 2490,
    popularity: 72,
    tags: ["spicy"],
    variants: [
      { name: ["6 дана", "6 шт.", "6 pcs"], price: 2490, isDefault: true },
      { name: ["12 дана", "12 шт.", "12 pcs"], price: 4290 },
    ],
    groups: [
      {
        name: ["Ащылық деңгейі", "Острота", "Heat level"],
        min: 1,
        max: 1,
        options: [
          { name: ["Жұмсақ", "Мягкие", "Mild"], price: 0 },
          { name: ["Орташа", "Средние", "Medium"], price: 0 },
          { name: ["Өте ащы", "Очень острые", "Hot"], price: 0 },
        ],
      },
      dipSauces,
    ],
  },
  {
    slug: "crispy-chicken",
    category: "sides",
    name: ["Қытырлақ тауық", "Хрустящая курица", "Crispy Chicken"],
    description: [
      "Фирмалық дәмдеуішпен маринадталған, қытырлақ қабықтағы тауық.",
      "Курица в хрустящей панировке, маринованная в фирменных специях.",
      "Chicken marinated in house spices with a crunchy coating.",
    ],
    allergens: ["gluten", "egg"],
    price: 2790,
    popularity: 60,
    groups: [dipSauces],
  },
  {
    slug: "chicken-tenders",
    category: "sides",
    name: ["Тауық стрипстері", "Куриные стрипсы", "Chicken Tenders"],
    description: [
      "Тұздығы бар тауық төс етінен жасалған шырынды стрипстер. 6 дана.",
      "Сочные стрипсы из куриного филе с соусом. 6 штук.",
      "Juicy chicken breast tenders with a dip. 6 pieces.",
    ],
    allergens: ["gluten", "egg"],
    price: 2290,
    popularity: 55,
    groups: [dipSauces],
  },
  {
    slug: "onion-rings",
    category: "sides",
    name: ["Пияз сақиналары", "Луковые кольца", "Onion Rings"],
    description: [
      "Сыра қамырындағы қытырлақ пияз сақиналары.",
      "Хрустящие луковые кольца в пивном кляре.",
      "Crispy beer-battered onion rings.",
    ],
    allergens: ["gluten"],
    price: 1290,
    popularity: 47,
    tags: ["vegetarian"],
    groups: [dipSauces],
  },
  {
    slug: "gyoza",
    category: "sides",
    name: ["Гёдза", "Гёдза", "Gyoza"],
    description: [
      "Тауық еті мен көкөніс салынған қуырылған жапон тұшпаралары. 6 дана.",
      "Обжаренные японские пельмени с курицей и овощами. 6 штук.",
      "Pan-fried Japanese dumplings with chicken and vegetables. 6 pieces.",
    ],
    allergens: ["gluten", "soy", "sesame"],
    price: 2190,
    popularity: 38,
  },

  // ---------- Salads ----------
  {
    slug: "green-bowl",
    category: "salads",
    name: ["Жасыл боул", "Зелёный боул", "Green Bowl"],
    description: [
      "Авокадо, ноқат, қызылша, балғын көкөністер және лимон тұздығы.",
      "Авокадо, нут, свёкла, свежие овощи и лимонная заправка.",
      "Avocado, chickpeas, beetroot, fresh vegetables and lemon dressing.",
    ],
    price: 2790,
    calories: 480,
    popularity: 50,
    tags: ["vegetarian", "healthy"],
    groups: [
      {
        name: ["Ақуыз қосу", "Добавить белок", "Add protein"],
        min: 0,
        max: 1,
        options: [
          { name: ["Гриль тауық", "Курица гриль", "Grilled chicken"], price: 790 },
          { name: ["Лосось", "Лосось", "Salmon"], price: 1290 },
        ],
      },
    ],
  },
  {
    slug: "salmon-salad-bowl",
    category: "salads",
    name: ["Лосось боулы", "Боул с лососем", "Salmon Bowl"],
    description: [
      "Күріш, лосось, эдамаме, қияр және кунжут тұздығы.",
      "Рис, лосось, эдамаме, огурец и кунжутная заправка.",
      "Rice, salmon, edamame, cucumber and sesame dressing.",
    ],
    allergens: ["fish", "soy", "sesame"],
    price: 3490,
    calories: 560,
    featured: true,
    popularity: 64,
    tags: ["healthy"],
  },
  {
    slug: "garden-salad",
    category: "salads",
    name: ["Бақша салаты", "Садовый салат", "Garden Salad"],
    description: [
      "Балғын жапырақтар, шие қызанақтары, қияр және бальзамик тұздығы.",
      "Свежие листья, томаты черри, огурцы и бальзамическая заправка.",
      "Fresh leaves, cherry tomatoes, cucumber and balsamic dressing.",
    ],
    price: 2190,
    calories: 260,
    popularity: 33,
    tags: ["vegetarian", "healthy"],
  },

  // ---------- Drinks ----------
  {
    slug: "iced-latte",
    category: "drinks",
    name: ["Мұздай латте", "Айс латте", "Iced Latte"],
    description: [
      "Эспрессо, салқын сүт және мұз.",
      "Эспрессо, холодное молоко и лёд.",
      "Espresso, cold milk and ice.",
    ],
    allergens: ["milk"],
    price: 1290,
    popularity: 69,
    variants: drinkSizes(1290, 1590),
    groups: [
      {
        name: ["Сироп", "Сироп", "Syrup"],
        min: 0,
        max: 1,
        options: [
          { name: ["Карамель", "Карамель", "Caramel"], price: 200 },
          { name: ["Ваниль", "Ваниль", "Vanilla"], price: 200 },
          { name: ["Фундук", "Фундук", "Hazelnut"], price: 200 },
        ],
      },
    ],
  },
  {
    slug: "berry-smoothie",
    category: "drinks",
    name: ["Жидек смузиі", "Ягодный смузи", "Berry Smoothie"],
    description: [
      "Құлпынай, таңқурай, банан және йогурт.",
      "Клубника, малина, банан и йогурт.",
      "Strawberry, raspberry, banana and yoghurt.",
    ],
    allergens: ["milk"],
    price: 1590,
    popularity: 46,
    variants: drinkSizes(1590, 1990),
  },
  {
    slug: "chocolate-milkshake",
    category: "drinks",
    name: ["Шоколадты милкшейк", "Шоколадный милкшейк", "Chocolate Milkshake"],
    description: [
      "Шоколадты балмұздақ, сүт және печенье үгіндісі.",
      "Шоколадное мороженое, молоко и крошка печенья.",
      "Chocolate ice cream, milk and cookie crumble.",
    ],
    allergens: ["milk", "gluten"],
    price: 1690,
    popularity: 57,
    variants: drinkSizes(1690, 2090),
    groups: [
      {
        name: ["Қосымшалар", "Добавки", "Extras"],
        min: 0,
        max: 2,
        options: [
          { name: ["Кілегей", "Взбитые сливки", "Whipped cream"], price: 250 },
          { name: ["Шоколад тұздығы", "Шоколадный топпинг", "Chocolate drizzle"], price: 200 },
        ],
      },
    ],
  },

  // ---------- Desserts ----------
  {
    slug: "new-york-cheesecake",
    category: "desserts",
    name: ["Нью-Йорк чизкейкі", "Чизкейк Нью-Йорк", "New York Cheesecake"],
    description: [
      "Құмды негіздегі нәзік кремді чизкейк, жидек тұздығымен.",
      "Нежный сливочный чизкейк на песочной основе с ягодным соусом.",
      "Silky cream cheesecake on a biscuit base with berry coulis.",
    ],
    allergens: ["milk", "gluten", "egg"],
    price: 1890,
    popularity: 62,
    featured: true,
  },
  {
    slug: "chocolate-brownie",
    category: "desserts",
    name: ["Шоколад брауниі", "Шоколадный брауни", "Chocolate Brownie"],
    description: [
      "Ішкі жағы ылғал, тығыз шоколадты брауни.",
      "Плотный шоколадный брауни с влажной серединкой.",
      "A dense, fudgy chocolate brownie.",
    ],
    allergens: ["milk", "gluten", "egg"],
    price: 1490,
    popularity: 51,
    groups: [
      {
        name: ["Қосымша", "Добавка", "Add"],
        min: 0,
        max: 1,
        options: [{ name: ["Ваниль балмұздағы", "Шарик ванильного мороженого", "Scoop of vanilla ice cream"], price: 450 }],
      },
    ],
  },
  {
    slug: "chocolate-cake",
    category: "desserts",
    name: ["Шоколад торты", "Шоколадный торт", "Chocolate Cake"],
    description: [
      "Үш қабатты шоколадты торт, ганашпен.",
      "Трёхслойный шоколадный торт с ганашем.",
      "Three-layer chocolate cake with ganache.",
    ],
    allergens: ["milk", "gluten", "egg"],
    price: 1790,
    popularity: 43,
  },
  {
    slug: "cookies",
    category: "desserts",
    name: ["Шоколад печеньесі", "Печенье с шоколадом", "Chocolate Chip Cookies"],
    description: [
      "Үйде пісірілген шоколад бөлшектері бар печенье. 3 дана.",
      "Домашнее печенье с кусочками шоколада. 3 штуки.",
      "Freshly baked chocolate chip cookies. 3 pieces.",
    ],
    allergens: ["milk", "gluten", "egg"],
    price: 990,
    popularity: 39,
  },
  {
    slug: "caramel-sundae",
    category: "desserts",
    name: ["Карамель сандэ", "Сандэ с карамелью", "Caramel Sundae"],
    description: [
      "Ваниль балмұздағы, тұзды карамель және қытырлақ вафли.",
      "Ванильное мороженое, солёная карамель и хрустящая вафля.",
      "Vanilla ice cream, salted caramel and a crispy wafer.",
    ],
    allergens: ["milk", "gluten"],
    price: 1390,
    popularity: 36,
    available: false,
  },
];

export type SeedCoupon = {
  code: string;
  descriptionKk: string;
  descriptionRu: string;
  descriptionEn: string;
  type: "PERCENT" | "FIXED";
  value: number;
  minSubtotal: number;
  maxDiscount: number | null;
  perUserLimit: number | null;
};

/** Public promo codes shown on the offers page. */
export const coupons: SeedCoupon[] = [
  {
    code: "WELCOME10",
    descriptionKk: "Алғашқы тапсырысқа 10% жеңілдік (2 000 ₸-ге дейін)",
    descriptionRu: "Скидка 10% на первый заказ (до 2 000 ₸)",
    descriptionEn: "10% off your first order (up to 2,000 ₸)",
    type: "PERCENT",
    value: 10,
    minSubtotal: 4000,
    maxDiscount: 2000,
    perUserLimit: 1,
  },
  {
    code: "PICKUP500",
    descriptionKk: "8 000 ₸-ден асатын тапсырысқа 500 ₸ жеңілдік",
    descriptionRu: "500 ₸ скидки на заказ от 8 000 ₸",
    descriptionEn: "500 ₸ off orders over 8,000 ₸",
    type: "FIXED",
    value: 500,
    minSubtotal: 8000,
    maxDiscount: null,
    perUserLimit: null,
  },
];
