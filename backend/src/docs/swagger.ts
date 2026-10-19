import swaggerJsdoc from 'swagger-jsdoc';

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Kanban Board API',
      version: '1.0.0',
      description: 'REST API для Kanban-доски (аналог Jira). Лабораторная работа.',
    },
    servers: [{ url: 'http://localhost:4000', description: 'Local' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth' },
      { name: 'Projects' },
      { name: 'Boards' },
      { name: 'Cards' },
      { name: 'Users' },
    ],
  },
  apis: ['src/modules/**/*.routes.ts'],
});
