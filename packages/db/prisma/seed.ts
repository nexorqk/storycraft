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
