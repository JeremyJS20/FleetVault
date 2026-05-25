import { prisma } from '../src/Infrastructure/db.js';

export const defaultPolicies = [
  {
    key: 'cobertura',
    title: 'Cobertura CDW / Seguro',
    content:
      'Todos los alquileres incluyen Exención de Daños por Colisión (CDW) con un deducible de RD$25,000. ' +
      'El deducible se reduce a RD$10,000 para clientes corporativos. ' +
      'CDW no cubre: neumáticos, rines, parabrisas, daños en la parte inferior, daños interiores, ' +
      'daños en el techo, robo de objetos de valor, costos de grúa o pérdida de llaves. ' +
      'El seguro de responsabilidad civil a terceros está incluido hasta RD$500,000. ' +
      'El seguro de accidentes personales cubre al conductor y pasajeros hasta RD$100,000 por persona.',
  },
  {
    key: 'combustible',
    title: 'Política de Combustible',
    content:
      'El vehículo se entrega con el tanque de combustible lleno y debe ser devuelto con el tanque lleno. ' +
      'Si el vehículo es devuelto con menos combustible del que tenía al momento de la salida, ' +
      'se cobrará el combustible faltante a la tarifa de mercado más una tarifa de servicio de RD$1,500. ' +
      'Se pueden solicitar recibos de combustible como comprobante de recarga.',
  },
  {
    key: 'kilometraje',
    title: 'Kilometraje Incluido',
    content:
      'Todos los alquileres incluyen 200 kilómetros libres por día. ' +
      'Los kilómetros adicionales se cobrarán a RD$15 por km para vehículos estándar ' +
      'y RD$25 por km para vehículos de lujo/SUV. ' +
      'Paquetes de kilometraje ilimitado están disponibles bajo solicitud para cuentas corporativas.',
  },
  {
    key: 'prohibiciones',
    title: 'Usos Prohibidos',
    content:
      'Los siguientes usos del vehículo alquilado están estrictamente prohibidos:\n' +
      '- Conducir el vehículo por cualquier persona no autorizada en este contrato.\n' +
      '- Participación en carreras, rallys o competencias de velocidad.\n' +
      '- Uso del vehículo bajo los efectos del alcohol o drogas.\n' +
      '- Transporte de materiales peligrosos o ilegales.\n' +
      '- Subarrendar o prestar el vehículo a terceros.\n' +
      '- Conducir fuera de carretera en caminos no pavimentados, playas o terrenos no autorizados.\n' +
      '- Usar el vehículo para transporte comercial de pasajeros o mercancías.\n' +
      '- Sacar el vehículo fuera de la República Dominicana bajo ninguna circunstancia.',
  },
  {
    key: 'conductores-adicionales',
    title: 'Conductores Adicionales',
    content:
      'Se pueden agregar conductores adicionales a este contrato por una tarifa de RD$500 por conductor por día. ' +
      'Todos los conductores adicionales deben cumplir con los mismos requisitos de edad y licencia que el arrendatario principal ' +
      'y deben estar presentes en la salida con su licencia de conducir original vigente. ' +
      'Máximo de dos conductores adicionales por alquiler.',
  },
  {
    key: 'territorio',
    title: 'Límite Territorial',
    content:
      'El vehículo puede ser conducido en todo el territorio de la República Dominicana, incluyendo todas las carreteras nacionales ' +
      'y áreas urbanas. Viajar a las siguientes regiones fronterizas requiere autorización previa:\n' +
      '- Dajabón\n' +
      '- Jimaní\n' +
      '- Pedernales\n' +
      '- Elías Piña\n\n' +
      'Viajar a Haití o cualquier otro país está estrictamente prohibido. ' +
      'La violación de los límites territoriales anula toda cobertura de seguro y el cliente asume ' +
      'la responsabilidad total por cualquier daño, robo o pérdida incurrida.',
  },

];

export async function seedPolicies() {
  for (const policy of defaultPolicies) {
    await prisma.rentalPolicy.upsert({
      where: { key: policy.key },
      update: {
        title: policy.title,
        content: policy.content,
        isActive: true,
      },
      create: {
        key: policy.key,
        title: policy.title,
        content: policy.content,
        isActive: true,
      },
    });
  }
  console.log('Seeded rental policies.');
}
