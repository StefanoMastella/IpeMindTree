import { Express, Request, Response } from "express";
import { pool, db } from "../db";
import { sql } from "drizzle-orm";

/**
 * Registra as rotas para o visualizador de banco de dados
 * @param app Express application
 */
export function registerDatabaseRoutes(app: Express) {
  // Obter lista de tabelas
  app.get("/api/database/tables", async (_req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
      `);
      
      const tables = result.rows.map(row => row.tablename);
      
      return res.json({ tables });
    } catch (error) {
      console.error("Error fetching database tables:", error);
      return res.status(500).json({ error: "Failed to fetch database tables" });
    }
  });

  // Obter dados de uma tabela específica
  app.get("/api/database/table/:tableName", async (req: Request, res: Response) => {
    try {
      const { tableName } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      
      // Verificar se a tabela existe
      const tableCheck = await pool.query(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = $1
      `, [tableName]);
      
      if (tableCheck.rows.length === 0) {
        return res.status(404).json({ error: `Table '${tableName}' not found` });
      }
      
      // Obter o total de registros para paginação
      const countResult = await pool.query(`
        SELECT COUNT(*) as total 
        FROM "${tableName}"
      `);
      
      const total = parseInt(countResult.rows[0].total);
      
      // Obter os dados da tabela
      const dataResult = await pool.query(`
        SELECT * 
        FROM "${tableName}" 
        ORDER BY (
          CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = $1 AND column_name = 'id') 
            THEN id 
            ELSE NULL 
          END
        ) ASC NULLS LAST
        LIMIT $2 OFFSET $3
      `, [tableName, limit, offset]);
      
      // Obter informações das colunas
      const columnsResult = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);
      
      const columns = columnsResult.rows.map(row => row.column_name);
      
      return res.json({
        table: tableName,
        data: dataResult.rows,
        columns,
        total,
        page,
        limit
      });
    } catch (error) {
      console.error(`Error fetching data from table:`, error);
      return res.status(500).json({ error: "Failed to fetch table data" });
    }
  });
}