import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type TemplatePageSeed = {
  pageNumber: number;
  textPrompt: string;
  illustrationPrompt: string;
};

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
        pageCount: template.pageCount,
        storyPrompt: template.storyPrompt,
        illustrationStylePrompt: template.illustrationStylePrompt,
      },
    });

    for (const page of pages) {
      await prisma.templatePage.upsert({
        where: {
          templateId_pageNumber: {
            templateId: existing.id,
            pageNumber: page.pageNumber,
          },
        },
        update: {
          textPrompt: page.textPrompt,
          illustrationPrompt: page.illustrationPrompt,
        },
        create: {
          templateId: existing.id,
          pageNumber: page.pageNumber,
          textPrompt: page.textPrompt,
          illustrationPrompt: page.illustrationPrompt,
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
        pages: {
          create: pages,
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
