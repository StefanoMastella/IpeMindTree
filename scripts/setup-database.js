#!/usr/bin/env node

/**
 * Script para configurar o banco PostgreSQL em produção
 * Uso: node setup-database.js <DATABASE_URL>
 */

import pkg from 'pg';
const { Client } = pkg;
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function setupDatabase() {
  const databaseUrl = process.argv[2] || process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL não fornecida!');
    console.log('Uso: node setup-database.js <DATABASE_URL>');
    console.log('Ou defina a variável de ambiente DATABASE_URL');
    process.exit(1);
  }

  console.log('🚀 Iniciando configuração do banco de dados...');
  
  try {
    // Conectar ao banco
    const client = new Client({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false }
    });
    
    await client.connect();
    console.log('✅ Conectado ao banco PostgreSQL');
    
    // Ler e executar o script SQL
    const sqlScript = readFileSync(join(__dirname, 'create_tables.sql'), 'utf8');
    
    console.log('📝 Executando script de criação das tabelas...');
    await client.query(sqlScript);
    
    console.log('✅ Tabelas criadas com sucesso!');
    
    // Verificar se as tabelas foram criadas
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('📋 Tabelas criadas:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    await client.end();
    console.log('🎉 Configuração do banco concluída!');
    
  } catch (error) {
    console.error('❌ Erro ao configurar banco:', error.message);
    process.exit(1);
  }
}

setupDatabase();