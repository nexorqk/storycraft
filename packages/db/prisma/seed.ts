import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.plan.upsert({
    where: { slug: 'free' },
    update: {
      name: 'Free',
      monthlyBookLimit: 1,
      isActive: true,
    },
    create: {
      slug: 'free',
      name: 'Free',
      monthlyBookLimit: 1,
    },
  });

  await prisma.template.upsert({
    where: { slug: 'kindness-adventure-ru' },
    update: {
      isActive: true,
      title: 'Приключение о доброте',
      description: 'Короткая поучительная история о доброте и помощи другим.',
      language: 'ru',
      pageCount: 8,
      storyPrompt:
        'Создай добрую детскую историю на русском языке с понятной моралью.',
      illustrationStylePrompt:
        'Теплые, мягкие иллюстрации для детской книги, дружелюбные персонажи.',
    },
    create: {
      slug: 'kindness-adventure-ru',
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
  });

  await prisma.template.upsert({
    where: { slug: 'forest-tale-ru' },
    update: {},
    create: {
      slug: 'forest-tale-ru',
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
  });

  await prisma.template.upsert({
    where: { slug: 'space-explorer-ru' },
    update: {},
    create: {
      slug: 'space-explorer-ru',
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
  });

  await prisma.template.upsert({
    where: { slug: 'bedtime-dreams-ru' },
    update: {},
    create: {
      slug: 'bedtime-dreams-ru',
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
  });
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
