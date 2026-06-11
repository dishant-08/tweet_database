"use strict";

// The app connects directly as the postgres role (bypasses RLS). Enabling RLS
// with no policies blocks Supabase PostgREST anon-key access to these tables.
const TABLES = ['"users"', '"Posts"', '"follows"', '"likes"', '"SequelizeMeta"'];

module.exports = {
  async up(queryInterface) {
    for (const table of TABLES) {
      await queryInterface.sequelize.query(
        `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`
      );
    }
  },

  async down(queryInterface) {
    for (const table of TABLES) {
      await queryInterface.sequelize.query(
        `ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`
      );
    }
  },
};
