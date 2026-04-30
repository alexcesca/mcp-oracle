import oracledb from "oracledb";
let pool = null;
export async function getPool() {
    if (!pool) {
        const ORACLE_USER = process.env.ORACLE_USER;
        const ORACLE_PASSWORD = process.env.ORACLE_PASSWORD;
        const ORACLE_CONNECT_STRING = process.env.ORACLE_CONNECT_STRING;
        pool = await oracledb.createPool({
            user: ORACLE_USER,
            password: ORACLE_PASSWORD,
            connectString: ORACLE_CONNECT_STRING,
            poolMin: 1,
            poolMax: 4,
            poolIncrement: 1,
        });
    }
    return pool;
}
export async function closePool() {
    if (pool) {
        try {
            await pool.close(0);
            pool = null;
        }
        catch (err) {
            console.error("Error closing connection pool", err);
        }
    }
}
/**
 * Executes a callback with a managed connection from the pool.
 * Automatically acquires and releases the connection.
 */
export async function withConnection(callback) {
    const p = await getPool();
    const connection = await p.getConnection();
    try {
        return await callback(connection);
    }
    finally {
        try {
            await connection.close();
        }
        catch (err) {
            console.error("Error closing connection", err);
        }
    }
}
