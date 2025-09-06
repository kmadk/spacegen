import type { 
  SpatialDataModel, 
  SpatialField, 
  SpatialIndex,
  DatabaseMigration,
  FieldType,
  FullstackGeneratorConfig
} from './types.js';
import type { SpatialElement } from '@fir/spatial-runtime';

export class DatabaseGenerator {
  private config: FullstackGeneratorConfig;

  constructor(config: FullstackGeneratorConfig) {
    this.config = config;
  }

  generateModelsFromElements(elements: SpatialElement[]): SpatialDataModel[] {
    const models: SpatialDataModel[] = [];
    const entityGroups = this.groupElementsByEntity(elements);

    for (const [entityName, entityElements] of entityGroups) {
      const model = this.createModelFromElements(entityName, entityElements);
      models.push(model);
    }

    // Add spatial metadata model if spatial queries enabled
    if (this.config.enableSpatialQueries) {
      models.push(this.createSpatialMetadataModel());
    }

    return models;
  }

  generateMigrations(models: SpatialDataModel[]): DatabaseMigration[] {
    const migrations: DatabaseMigration[] = [];

    // Initial schema migration
    const initialMigration = this.createInitialSchemaMigration(models);
    migrations.push(initialMigration);

    // Spatial extensions migration (if needed)
    if (this.config.enableSpatialQueries && this.requiresSpatialExtensions()) {
      const spatialMigration = this.createSpatialExtensionsMigration();
      migrations.push(spatialMigration);
    }

    // Indexes migration
    const indexMigration = this.createIndexesMigration(models);
    migrations.push(indexMigration);

    return migrations;
  }

  generateSchemaSQL(models: SpatialDataModel[]): string {
    const statements: string[] = [];

    // Add database extensions if needed
    if (this.config.enableSpatialQueries) {
      statements.push(this.generateExtensionsSQL());
    }

    // Create tables
    for (const model of models) {
      statements.push(this.generateTableSQL(model));
    }

    // Create indexes
    for (const model of models) {
      statements.push(...this.generateIndexesSQL(model));
    }

    // Create relationships
    for (const model of models) {
      statements.push(...this.generateRelationshipsSQL(model));
    }

    return statements.filter(Boolean).join('\n\n');
  }

  private groupElementsByEntity(elements: SpatialElement[]): Map<string, SpatialElement[]> {
    const groups = new Map<string, SpatialElement[]>();

    for (const element of elements) {
      const entityName = this.inferEntityName(element);
      
      if (!groups.has(entityName)) {
        groups.set(entityName, []);
      }
      groups.get(entityName)!.push(element);
    }

    return groups;
  }

  private inferEntityName(element: SpatialElement): string {
    // Use semantic level and type to infer entity name
    const baseName = element.id;
    
    // Clean and normalize the name
    return this.normalizeEntityName(baseName);
  }

  private normalizeEntityName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  private createModelFromElements(entityName: string, elements: SpatialElement[]): SpatialDataModel {
    const fields = this.generateFieldsFromElements(elements);
    const spatialIndexes = this.generateSpatialIndexes(fields);
    
    return {
      name: this.toPascalCase(entityName),
      tableName: this.toSnakeCase(entityName),
      fields,
      spatialIndexes,
      relationships: [], // Will be populated by relationship analysis
      metadata: {
        elementType: elements[0]?.type,
        spatialBounds: this.calculateBounds(elements),
        createdAt: new Date().toISOString(),
        generated: true
      }
    };
  }

  private generateFieldsFromElements(elements: SpatialElement[]): SpatialField[] {
    const fields: SpatialField[] = [];

    // Add primary key
    fields.push({
      name: 'id',
      type: 'string',
      required: true,
      unique: true,
      defaultValue: this.getUUIDDefault()
    });

    // Add spatial position fields
    fields.push({
      name: 'position',
      type: 'geometry',
      required: true,
      spatial: {
        geometryType: 'POINT',
        spatialIndex: true,
        srid: 4326
      }
    });

    // Add bounds if multiple elements
    if (elements.length > 1) {
      fields.push({
        name: 'bounds',
        type: 'geometry',
        required: false,
        spatial: {
          geometryType: 'POLYGON',
          spatialIndex: true,
          srid: 4326
        }
      });
    }

    // Add semantic level
    fields.push({
      name: 'semantic_level',
      type: 'string',
      required: true,
      constraints: {
        enum: ['universal', 'system', 'standard', 'atomic']
      }
    });

    // Add basic content field
    fields.push({
      name: 'content',
      type: 'string',
      required: false
    });

    // Add metadata fields
    fields.push({
      name: 'created_at',
      type: 'date',
      required: true,
      defaultValue: 'CURRENT_TIMESTAMP'
    });

    fields.push({
      name: 'updated_at',
      type: 'date',
      required: true,
      defaultValue: 'CURRENT_TIMESTAMP'
    });

    return fields;
  }


  private generateSpatialIndexes(fields: SpatialField[]): SpatialIndex[] {
    const indexes: SpatialIndex[] = [];

    // Create spatial indexes for geometry fields
    const geometryFields = fields.filter(f => f.spatial?.spatialIndex);
    
    for (const field of geometryFields) {
      indexes.push({
        name: `idx_${field.name}_spatial`,
        fields: [field.name],
        type: 'spatial',
        options: {
          using: this.config.database === 'postgresql' ? 'GIST' : 'SPATIAL'
        }
      });
    }

    // Add semantic level index
    if (fields.some(f => f.name === 'semantic_level')) {
      indexes.push({
        name: 'idx_semantic_level',
        fields: ['semantic_level'],
        type: 'btree'
      });
    }

    return indexes;
  }

  private createSpatialMetadataModel(): SpatialDataModel {
    return {
      name: 'SpatialMetadata',
      tableName: 'spatial_metadata',
      fields: [
        {
          name: 'id',
          type: 'string',
          required: true,
          unique: true,
          defaultValue: this.getUUIDDefault()
        },
        {
          name: 'entity_type',
          type: 'string',
          required: true
        },
        {
          name: 'entity_id',
          type: 'string',
          required: true
        },
        {
          name: 'viewport_bounds',
          type: 'geometry',
          required: true,
          spatial: {
            geometryType: 'POLYGON',
            spatialIndex: true,
            srid: 4326
          }
        },
        {
          name: 'zoom_level',
          type: 'number',
          required: true
        },
        {
          name: 'visible',
          type: 'boolean',
          required: true,
          defaultValue: true
        }
      ],
      spatialIndexes: [
        {
          name: 'idx_viewport_bounds_spatial',
          fields: ['viewport_bounds'],
          type: 'spatial'
        },
        {
          name: 'idx_entity_lookup',
          fields: ['entity_type', 'entity_id'],
          type: 'btree'
        }
      ],
      relationships: [],
      metadata: {
        createdAt: new Date().toISOString(),
        generated: true
      }
    };
  }

  private createInitialSchemaMigration(models: SpatialDataModel[]): DatabaseMigration {
    const upStatements: string[] = [];
    const downStatements: string[] = [];

    for (const model of models) {
      upStatements.push(this.generateTableSQL(model));
      downStatements.push(`DROP TABLE IF EXISTS ${model.tableName};`);
    }

    return {
      id: '001',
      name: 'create_initial_schema',
      up: upStatements.join('\n\n'),
      down: downStatements.reverse().join('\n'),
      timestamp: new Date().toISOString()
    };
  }

  private createSpatialExtensionsMigration(): DatabaseMigration {
    const up = this.config.database === 'postgresql' 
      ? 'CREATE EXTENSION IF NOT EXISTS postgis;'
      : '-- Spatial extensions enabled';

    const down = this.config.database === 'postgresql'
      ? 'DROP EXTENSION IF EXISTS postgis;'
      : '-- No spatial extensions to remove';

    return {
      id: '000',
      name: 'enable_spatial_extensions',
      up,
      down,
      timestamp: new Date().toISOString()
    };
  }

  private createIndexesMigration(models: SpatialDataModel[]): DatabaseMigration {
    const upStatements: string[] = [];
    const downStatements: string[] = [];

    for (const model of models) {
      const indexStatements = this.generateIndexesSQL(model);
      upStatements.push(...indexStatements);
      
      for (const index of model.spatialIndexes) {
        downStatements.push(`DROP INDEX IF EXISTS ${index.name};`);
      }
    }

    return {
      id: '002',
      name: 'create_indexes',
      up: upStatements.join('\n'),
      down: downStatements.join('\n'),
      timestamp: new Date().toISOString()
    };
  }

  private generateTableSQL(model: SpatialDataModel): string {
    const columns = model.fields.map(field => this.generateColumnSQL(field));
    
    return `CREATE TABLE ${model.tableName} (\n  ${columns.join(',\n  ')}\n);`;
  }

  private generateColumnSQL(field: SpatialField): string {
    let sql = `${field.name} ${this.getColumnType(field)}`;
    
    if (field.required) sql += ' NOT NULL';
    if (field.unique) sql += ' UNIQUE';
    if (field.defaultValue) sql += ` DEFAULT ${this.formatDefaultValue(field.defaultValue)}`;
    
    return sql;
  }

  private getColumnType(field: SpatialField): string {
    const provider = this.config.database;
    
    switch (field.type) {
      case 'string':
        const maxLength = field.constraints?.maxLength || 255;
        return provider === 'postgresql' ? `VARCHAR(${maxLength})` : `VARCHAR(${maxLength})`;
      
      case 'number':
        return provider === 'postgresql' ? 'NUMERIC' : 'DECIMAL';
      
      case 'boolean':
        return provider === 'postgresql' ? 'BOOLEAN' : 'BOOLEAN';
      
      case 'date':
        return provider === 'postgresql' ? 'TIMESTAMP WITH TIME ZONE' : 'DATETIME';
      
      case 'json':
        return provider === 'postgresql' ? 'JSONB' : 'JSON';
      
      case 'geometry':
      case 'point':
      case 'polygon':
        if (provider === 'postgresql') {
          const geomType = field.spatial?.geometryType || 'GEOMETRY';
          const srid = field.spatial?.srid || 4326;
          return `GEOMETRY(${geomType}, ${srid})`;
        }
        return 'GEOMETRY';
      
      case 'array':
        return provider === 'postgresql' ? 'JSONB' : 'JSON';
      
      default:
        return 'TEXT';
    }
  }

  private generateIndexesSQL(model: SpatialDataModel): string[] {
    return model.spatialIndexes.map(index => {
      const indexType = index.type === 'spatial' && this.config.database === 'postgresql' 
        ? 'USING GIST' 
        : '';
      
      return `CREATE INDEX ${index.name} ON ${model.tableName} ${indexType} (${index.fields.join(', ')});`;
    });
  }

  private generateRelationshipsSQL(model: SpatialDataModel): string[] {
    return model.relationships.map(rel => {
      const constraintName = `fk_${model.tableName}_${rel.foreignKey}`;
      return `ALTER TABLE ${model.tableName} ADD CONSTRAINT ${constraintName} FOREIGN KEY (${rel.foreignKey}) REFERENCES ${this.toSnakeCase(rel.model)}(id);`;
    });
  }

  private generateExtensionsSQL(): string {
    if (this.config.database === 'postgresql') {
      return 'CREATE EXTENSION IF NOT EXISTS postgis;\nCREATE EXTENSION IF NOT EXISTS "uuid-ossp";';
    }
    return '';
  }

  private calculateBounds(elements: SpatialElement[]) {
    if (elements.length === 0) return undefined;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const element of elements) {
      minX = Math.min(minX, element.position.x);
      minY = Math.min(minY, element.position.y);
      maxX = Math.max(maxX, element.position.x + (element.bounds?.width || 0));
      maxY = Math.max(maxY, element.position.y + (element.bounds?.height || 0));
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  private requiresSpatialExtensions(): boolean {
    return this.config.database === 'postgresql' && (this.config.enableSpatialQueries ?? false);
  }

  private getUUIDDefault(): string {
    return this.config.database === 'postgresql' ? 'uuid_generate_v4()' : 'UUID()';
  }

  private formatDefaultValue(value: any): string {
    if (typeof value === 'string') {
      if (value === 'CURRENT_TIMESTAMP' || value.includes('()')) {
        return value;
      }
      return `'${value}'`;
    }
    return String(value);
  }

  private toPascalCase(str: string): string {
    return str.split(/[^a-zA-Z0-9]/).map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join('');
  }

  private toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_');
  }
}