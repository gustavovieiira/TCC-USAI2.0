import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const condominio = await prisma.condominio.upsert({
    where: { linkSlug: 'residencial-jardim-europa' },
    update: {},
    create: {
      nome: 'Residencial Jardim Europa',
      linkSlug: 'residencial-jardim-europa',
      pin: '1234',
      ativo: true,
    },
  });

  console.log('Condomínio de teste pronto:');
  console.log(`  Link: /cadastro?condominio=${condominio.linkSlug}`);
  console.log(`  PIN: ${condominio.pin}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
