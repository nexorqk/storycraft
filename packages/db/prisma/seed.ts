import '../prisma.config';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type TemplatePageSeed = {
  pageNumber: number;
  textPrompt?: string;
  illustrationPrompt?: string;
  baseText?: string;
  illustrationPromptBase?: string;
  sceneDescription?: string;
  personalizationSlots?: Record<string, string>;
};

function normalizeTemplatePage(page: TemplatePageSeed) {
  const baseText = page.baseText ?? page.textPrompt ?? '';
  const illustrationPromptBase =
    page.illustrationPromptBase ?? page.illustrationPrompt ?? null;

  return {
    pageNumber: page.pageNumber,
    textPrompt: page.textPrompt ?? baseText,
    illustrationPrompt: page.illustrationPrompt ?? illustrationPromptBase ?? '',
    baseText,
    illustrationPromptBase,
    sceneDescription: page.sceneDescription ?? null,
    personalizationSlots: page.personalizationSlots,
  };
}

async function upsertTemplateWithPages(
  slug: string,
  template: {
    title: string;
    description: string;
    language: string;
    ageMin: number;
    ageMax: number;
    pageCount: number;
    storyPrompt: string;
    illustrationStylePrompt: string;
    isActive?: boolean;
  },
  pages: TemplatePageSeed[],
) {
  const existing = await prisma.template.findUnique({
    where: { slug },
    include: { pages: true },
  });

  if (existing) {
    await prisma.template.update({
      where: { slug },
      data: {
        isActive: true,
        title: template.title,
        description: template.description,
        language: template.language,
        ageMin: template.ageMin,
        ageMax: template.ageMax,
        pageCount: template.pageCount,
        storyPrompt: template.storyPrompt,
        illustrationStylePrompt: template.illustrationStylePrompt,
        isActive: template.isActive ?? true,
      },
    });

    for (const page of pages) {
      const normalizedPage = normalizeTemplatePage(page);

      await prisma.templatePage.upsert({
        where: {
          templateId_pageNumber: {
            templateId: existing.id,
            pageNumber: page.pageNumber,
          },
        },
        update: normalizedPage,
        create: {
          templateId: existing.id,
          ...normalizedPage,
        },
      });
    }
  } else {
    await prisma.template.create({
      data: {
        slug,
        title: template.title,
        description: template.description,
        language: template.language,
        ageMin: template.ageMin,
        ageMax: template.ageMax,
        pageCount: template.pageCount,
        storyPrompt: template.storyPrompt,
        illustrationStylePrompt: template.illustrationStylePrompt,
        isActive: template.isActive ?? true,
        pages: {
          create: pages.map(normalizeTemplatePage),
        },
      },
    });
  }
}

async function main() {
  await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN' },
  });

  await prisma.role.upsert({
    where: { name: 'USER' },
    update: {},
    create: { name: 'USER' },
  });

  await prisma.plan.upsert({
    where: { slug: 'free' },
    update: {
      name: 'Free',
      monthlyBookLimit: 3,
      isActive: true,
    },
    create: {
      slug: 'free',
      name: 'Free',
      monthlyBookLimit: 3,
    },
  });

  await upsertTemplateWithPages(
    'lost-star-no-ai-ru',
    {
      title: 'Потерянная звёздочка',
      description:
        'Мягкая волшебная сказка о том, как ребёнок помогает маленькой звезде вернуться домой.',
      language: 'ru',
      ageMin: 3,
      ageMax: 7,
      pageCount: 8,
      storyPrompt:
        'Детерминированный шаблон без AI: ребёнок помогает потерянной звёздочке.',
      illustrationStylePrompt:
        'Тёплая цифровая детская книга с мягким ночным светом и добрыми персонажами.',
      isActive: true,
    },
    [
      {
        pageNumber: 1,
        baseText:
          'Однажды вечером ребёнок по имени {childName} посмотрел в окно и увидел, что одна маленькая звёздочка упала с неба.\nОна тихо светилась возле сада и будто просила о помощи.\n{childName} взял {favoriteToy} и решил вернуть звёздочку домой.',
        illustrationPromptBase:
          'A cozy Russian child room at night, a small glowing star near the garden, soft magical light.',
        sceneDescription: 'Знакомство с упавшей звёздочкой.',
        personalizationSlots: {
          childName: 'Имя ребёнка',
          favoriteToy: 'Любимая игрушка',
        },
      },
      {
        pageNumber: 2,
        baseText:
          'Звёздочка рассказала, что сильный ветер унёс её с небесной дорожки.\nЧтобы вернуться домой, ей нужно было найти серебряный луч в месте под названием {setting}.\n{childName} улыбнулся и сказал: «Мы обязательно его найдём».',
        illustrationPromptBase:
          'A glowing little star speaking with a child, a magical path leading toward an enchanted setting.',
        sceneDescription: 'Звёздочка просит найти серебряный луч.',
        personalizationSlots: {
          childName: 'Имя ребёнка',
          setting: 'Место приключения',
        },
      },
      {
        pageNumber: 3,
        baseText:
          'У ворот {setting} их встретил {favoriteAnimal}.\nОн сначала немного стеснялся, но звёздочка мигнула так ласково, что новый друг подошёл ближе.\nТеперь у {childName} была целая команда для доброго дела.',
        illustrationPromptBase:
          'A child, a small glowing star, and a friendly animal at the entrance to a magical place.',
        sceneDescription: 'Встреча с помощником.',
        personalizationSlots: {
          childName: 'Имя ребёнка',
          setting: 'Место приключения',
          favoriteAnimal: 'Любимое животное',
        },
      },
      {
        pageNumber: 4,
        baseText:
          'Дорожка привела друзей к ручью, который переливался синим и золотым.\n{childName} вспомнил, как любит {mainInterest}, и придумал смелый план.\nНужно было построить мостик из лунных камешков, чтобы звёздочка не намочила лучики.',
        illustrationPromptBase:
          'A moonlit stream with blue and golden reflections, a child arranging glowing moon stones.',
        sceneDescription: 'Первое препятствие и идея ребёнка.',
        personalizationSlots: {
          childName: 'Имя ребёнка',
          mainInterest: 'Главный интерес ребёнка',
        },
      },
      {
        pageNumber: 5,
        baseText:
          'Мостик получился крепким, и друзья перешли на другую сторону.\nТам росли колокольчики, которые звенели только от добрых слов.\n{childName} вспомнил тёплые слова, которые часто говорит {parentName}, и цветы зазвенели серебром.',
        illustrationPromptBase:
          'Silver bell flowers ringing under moonlight as a child and glowing star cross a tiny bridge.',
        sceneDescription: 'Добрые слова открывают путь дальше.',
        personalizationSlots: {
          childName: 'Имя ребёнка',
          parentName: 'Имя родителя',
        },
      },
      {
        pageNumber: 6,
        baseText:
          'За колокольчиками спряталась маленькая тучка.\nОна не хотела никого пугать, просто потеряла свою улыбку.\n{childName} протянул ей {favoriteToy}, и тучка рассмеялась тёплым дождиком из искорок.',
        illustrationPromptBase:
          'A small friendly cloud smiling after receiving a favorite toy, sparkling warm rain in a fairy-tale forest.',
        sceneDescription: 'Ребёнок помогает грустной тучке.',
        personalizationSlots: {
          childName: 'Имя ребёнка',
          favoriteToy: 'Любимая игрушка',
        },
      },
      {
        pageNumber: 7,
        baseText:
          'Когда тучка улыбнулась, из-за неё выглянул серебряный луч.\nЗвёздочка подпрыгнула от радости и мягко коснулась луча.\n«Спасибо, {heroName}, ты настоящий хранитель света», — прошептала она.',
        illustrationPromptBase:
          'A silver moonbeam lifting a happy little star, a child glowing with warm reflected light.',
        sceneDescription: 'Серебряный луч найден.',
        personalizationSlots: {
          heroName: 'Имя героя в истории',
        },
      },
      {
        pageNumber: 8,
        baseText:
          'Луч поднял звёздочку всё выше и выше, пока она снова не засияла на небе.\n{favoriteAnimal} помахал ей лапкой, а {childName} загадал желание о новых добрых приключениях.\nС тех пор, когда над {setting} вспыхивала самая яркая искра, {childName} знал: это звёздочка говорит спасибо.',
        illustrationPromptBase:
          'A little star shining in the night sky above a magical setting, a child and friendly animal waving goodbye.',
        sceneDescription: 'Счастливое возвращение звёздочки домой.',
        personalizationSlots: {
          childName: 'Имя ребёнка',
          favoriteAnimal: 'Любимое животное',
          setting: 'Место приключения',
        },
      },
    ],
  );

  await upsertTemplateWithPages(
    'kindness-adventure-ru',
    {
      title: 'Приключение о доброте',
      description: 'Короткая поучительная история о доброте и помощи другим.',
      language: 'ru',
      ageMin: 3,
      ageMax: 7,
      pageCount: 8,
      storyPrompt:
        'Создай добрую детскую историю на русском языке с понятной моралью.',
      illustrationStylePrompt:
        'Теплые, мягкие иллюстрации для детской книги, дружелюбные персонажи.',
      isActive: false,
    },
    [
      {
        pageNumber: 1,
        textPrompt: 'Познакомь ребёнка с главным героем — добрым и любопытным.',
        illustrationPrompt:
          'Милый персонаж стоит на солнечной поляне, улыбается.',
      },
      {
        pageNumber: 2,
        textPrompt: 'Герой замечает кого-то, кому нужна помощь.',
        illustrationPrompt:
          'Персонаж видит маленькое грустное животное в кустах.',
      },
      {
        pageNumber: 3,
        textPrompt: 'Герой решает помочь и отправляется в путь.',
        illustrationPrompt:
          'Персонаж идёт по тропинке через яркий весенний лес.',
      },
      {
        pageNumber: 4,
        textPrompt: 'На пути встречается друг, который тоже хочет помочь.',
        illustrationPrompt:
          'Два персонажа встречаются и радостно приветствуют друг друга.',
      },
      {
        pageNumber: 5,
        textPrompt: 'Вместе они придумывают план помощи.',
        illustrationPrompt:
          'Друзья сидят вместе и обсуждают план, рисуя на земле.',
      },
      {
        pageNumber: 6,
        textPrompt: 'На пути возникает небольшое препятствие.',
        illustrationPrompt: 'Персонажи перед ручьём, думают, как его перейти.',
      },
      {
        pageNumber: 7,
        textPrompt: 'Доброта и teamwork помогают преодолеть трудность.',
        illustrationPrompt:
          'Герои вместе строят мостик через ручей, все счастливы.',
      },
      {
        pageNumber: 8,
        textPrompt: 'Счастливый конец: все рады, герой понял важность доброты.',
        illustrationPrompt:
          'Все персонажи вместе празднуют на закате, радужное небо.',
      },
    ],
  );

  await upsertTemplateWithPages(
    'forest-tale-ru',
    {
      title: 'Сказка лесного зверя',
      description:
        'Волшебная история о приключениях маленького зверя в загадочном лесу.',
      language: 'ru',
      ageMin: 4,
      ageMax: 8,
      pageCount: 8,
      storyPrompt: 'Создай волшебную сказку о лесном зверьке на русском языке.',
      illustrationStylePrompt:
        'Акварельные иллюстрации русского леса с милыми животными персонажами.',
      isActive: false,
    },
    [
      {
        pageNumber: 1,
        textPrompt: 'Опиши тихое утро в волшебном лесу, зверёк просыпается.',
        illustrationPrompt:
          'Утренний лес в тумане, маленький зверёк выглядывает из норки.',
      },
      {
        pageNumber: 2,
        textPrompt: 'Зверёк слышит загадочный звук и решает исследовать.',
        illustrationPrompt: 'Зверёк настороженно прислушивается, уши подняты.',
      },
      {
        pageNumber: 3,
        textPrompt: 'Путешествие вглубь незнакомого леса.',
        illustrationPrompt:
          'Зверёк идёт по тропинке среди высоких деревьев с мхом.',
      },
      {
        pageNumber: 4,
        textPrompt: 'Встреча с мудрым старым жителем леса.',
        illustrationPrompt:
          'Мудрая сова или старый барсук разговаривает со зверьком.',
      },
      {
        pageNumber: 5,
        textPrompt: 'Старец рассказывает о тайне леса.',
        illustrationPrompt: 'Светящийся гриб или волшебный кристалл в пещере.',
      },
      {
        pageNumber: 6,
        textPrompt: 'Зверёк проходит небольшое испытание.',
        illustrationPrompt: 'Зверёк переходит по камешкам через быструю речку.',
      },
      {
        pageNumber: 7,
        textPrompt: 'Зверёк находит источник загадочного звука.',
        illustrationPrompt: 'Маленький потерявшийся птенец зовёт маму.',
      },
      {
        pageNumber: 8,
        textPrompt: 'Зверёк помогает и возвращается домой героем.',
        illustrationPrompt: 'Зверёк возвращается в норку на закате, довольный.',
      },
    ],
  );

  await upsertTemplateWithPages(
    'space-explorer-ru',
    {
      title: 'Космический путешественник',
      description:
        'История о ребёнке, который отправляется в путешествие по звёздам.',
      language: 'ru',
      ageMin: 5,
      ageMax: 10,
      pageCount: 10,
      storyPrompt: 'Создай историю о космическом путешествии на русском языке.',
      illustrationStylePrompt:
        'Яркие иллюстрации космоса, планет и звёзд в детском стиле.',
      isActive: false,
    },
    [
      {
        pageNumber: 1,
        textPrompt: 'Ребёнок мечтает о звёздах, глядя в ночное небо.',
        illustrationPrompt: 'Ребёнок у окна, за окном огромное звёздное небо.',
      },
      {
        pageNumber: 2,
        textPrompt: 'Ребёнок находит или строит космический корабль.',
        illustrationPrompt:
          'Маленький яркий космический корабль в гараже или на чердаке.',
      },
      {
        pageNumber: 3,
        textPrompt: 'Старт! Корабль взлетает в космос.',
        illustrationPrompt:
          'Корабль взлетает, оставляя огненный хвост, Земля уменьшается.',
      },
      {
        pageNumber: 4,
        textPrompt: 'Первая остановка — планета из конфет.',
        illustrationPrompt: 'Разноцветная планета с леденцовыми деревьями.',
      },
      {
        pageNumber: 5,
        textPrompt: 'Встреча с дружелюбным инопланетянином.',
        illustrationPrompt: 'Милый инопланетянин машет рукой ребёнку.',
      },
      {
        pageNumber: 6,
        textPrompt: 'Вместе они отправляются дальше.',
        illustrationPrompt:
          'Ребёнок и инопланетянин летят в корабле сквозь звёзды.',
      },
      {
        pageNumber: 7,
        textPrompt: 'Опасность — астероидный пояс!',
        illustrationPrompt: 'Корабль маневрирует между огромными астероидами.',
      },
      {
        pageNumber: 8,
        textPrompt: 'Друзья спасают друг друга и находят тайну галактики.',
        illustrationPrompt: 'Светящаяся туманность в форме сердца или звезды.',
      },
      {
        pageNumber: 9,
        textPrompt: 'Пора домой, но друзья обещают встретиться снова.',
        illustrationPrompt: 'Ребёнок и инопланетянин обнимаются у корабля.',
      },
      {
        pageNumber: 10,
        textPrompt: 'Ребёнок возвращается домой с новой мечтой.',
        illustrationPrompt:
          'Ребёнок снова у окна, но теперь с улыбкой и рисунком корабля.',
      },
    ],
  );

  await upsertTemplateWithPages(
    'bedtime-dreams-ru',
    {
      title: 'Сонные мечты',
      description: 'Тихая, успокаивающая история перед сном.',
      language: 'ru',
      ageMin: 2,
      ageMax: 6,
      pageCount: 6,
      storyPrompt:
        'Создай спокойную историю перед сном на русском языке с мягким сюжетом.',
      illustrationStylePrompt:
        'Мягкие, пастельные иллюстрации ночного неба и уютных сцен.',
      isActive: false,
    },
    [
      {
        pageNumber: 1,
        textPrompt: 'Солнце садится, мир готовится ко сну.',
        illustrationPrompt:
          'Закат над тихим городком, мягкие оранжевые и фиолетовые тона.',
      },
      {
        pageNumber: 2,
        textPrompt: 'Малыш ложится в кроватку, закрывает глазки.',
        illustrationPrompt:
          'Ребёнок в уютной кроватке с мягким одеялом, луна в окне.',
      },
      {
        pageNumber: 3,
        textPrompt: 'Сны начинают приходить — лёгкие и волшебные.',
        illustrationPrompt:
          'Светящиеся звёздочки и бабочки летают вокруг кроватки.',
      },
      {
        pageNumber: 4,
        textPrompt: 'Малыш попадает в волшебную страну снов.',
        illustrationPrompt:
          'Мягкие облака, по которым можно ходить, радуга ночью.',
      },
      {
        pageNumber: 5,
        textPrompt: 'Тихое приключение — встреча с лунным зверьком.',
        illustrationPrompt: 'Маленький светящийся зверёк сидит на облаке.',
      },
      {
        pageNumber: 6,
        textPrompt: 'Малыш засыпает крепко, завтра будет новый день.',
        illustrationPrompt:
          'Спящий ребёнок, луна светит нежно, всё тихо и спокойно.',
      },
    ],
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
