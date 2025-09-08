/**
 * Type validation tests to ensure type safety
 */

import { describe, it, expect } from "vitest";
import type {
  DesignData,
  DesignNode,
  DesignScreenshot,
  BackendGeneratorConfig,
  AIAnalysisConfig,
  VisionAnalysisResult,
  AIEntityAnalysis,
  DetectedEntity,
  SuggestedRelationship,
  VisualPattern,
  GeneratedBackend,
  DatabaseField,
  APIEndpoint,
} from "../types.js";

describe("Type Definitions", () => {
  describe("DesignData", () => {
    it("should accept valid Figma design data", () => {
      const figmaData: DesignData = {
        source: "figma",
        fileId: "test-file-123",
        fileName: "Test Design",
        nodes: [
          {
            id: "1:1",
            name: "Test Frame",
            type: "FRAME",
            absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 },
          },
        ],
        metadata: {
          version: "1.0.0",
          lastModified: "2024-01-01T00:00:00Z",
          author: "Test Author",
        },
      };

      expect(figmaData.source).toBe("figma");
      expect(figmaData.nodes).toHaveLength(1);
      expect(figmaData.metadata?.version).toBe("1.0.0");
    });

    it("should accept valid Penpot design data", () => {
      const penpotData: DesignData = {
        source: "penpot",
        fileId: "penpot-file-456",
        fileName: "Penpot Design",
        nodes: [
          {
            id: "rect-1",
            name: "Test Rectangle",
            type: "rect",
            absoluteBoundingBox: { x: 10, y: 10, width: 200, height: 150 },
          },
        ],
        metadata: {
          version: "2.0.0",
          lastModified: "2024-01-02T00:00:00Z",
        },
      };

      expect(penpotData.source).toBe("penpot");
      expect(penpotData.nodes[0].type).toBe("rect");
    });
  });

  describe("DesignNode", () => {
    it("should handle nodes with children", () => {
      const nodeWithChildren: DesignNode = {
        id: "parent-1",
        name: "Parent Frame",
        type: "FRAME",
        absoluteBoundingBox: { x: 0, y: 0, width: 300, height: 200 },
        children: [
          {
            id: "child-1",
            name: "Child Text",
            type: "TEXT",
            characters: "Hello World",
            absoluteBoundingBox: { x: 20, y: 20, width: 100, height: 20 },
          },
        ],
      };

      expect(nodeWithChildren.children).toHaveLength(1);
      expect(nodeWithChildren.children?.[0].characters).toBe("Hello World");
    });

    it("should handle text nodes with styling", () => {
      const textNode: DesignNode = {
        id: "text-1",
        name: "Styled Text",
        type: "TEXT",
        characters: "Styled content",
        absoluteBoundingBox: { x: 0, y: 0, width: 150, height: 30 },
        fills: [
          {
            type: "SOLID",
            color: { r: 1, g: 0, b: 0, a: 1 },
          },
        ],
      };

      expect(textNode.characters).toBe("Styled content");
      expect(textNode.fills).toHaveLength(1);
      expect(textNode.fills?.[0].color.r).toBe(1);
    });
  });

  describe("BackendGeneratorConfig", () => {
    it("should accept minimal configuration", () => {
      const minimalConfig: BackendGeneratorConfig = {
        projectName: "test-project",
        openaiApiKey: "sk-test",
        debug: false,
        enableSpatialQueries: false,
      };

      expect(minimalConfig.projectName).toBe("test-project");
      expect(minimalConfig.debug).toBe(false);
    });

    it("should accept full configuration", () => {
      const fullConfig: BackendGeneratorConfig = {
        projectName: "full-project",
        openaiApiKey: "sk-full",
        debug: true,
        enableSpatialQueries: true,
        database: {
          type: "postgresql",
          enablePostGIS: true,
        },
        deployment: {
          enabled: true,
          provider: "supabase",
        },
      };

      expect(fullConfig.database?.type).toBe("postgresql");
      expect(fullConfig.deployment?.enabled).toBe(true);
    });
  });

  describe("DetectedEntity", () => {
    it("should have proper field structure", () => {
      const entity: DetectedEntity = {
        name: "User",
        tableName: "users",
        description: "Application user entity",
        fields: [
          {
            name: "id",
            type: "uuid",
            required: true,
            primary: true,
            description: "Primary key",
          },
          {
            name: "email",
            type: "varchar(320)",
            required: true,
            unique: true,
            description: "User email",
          },
          {
            name: "name",
            type: "varchar(255)",
            required: true,
            description: "Full name",
          },
        ],
        indexes: ["email"],
        sourceElements: ["node-1", "node-2"],
        confidence: 0.9,
        reasoning: "User pattern detected from profile section",
      };

      expect(entity.fields).toHaveLength(3);
      expect(entity.fields[0].primary).toBe(true);
      expect(entity.fields[1].unique).toBe(true);
      expect(entity.confidence).toBe(0.9);
    });
  });

  describe("SuggestedRelationship", () => {
    it("should define valid relationships", () => {
      const oneToMany: SuggestedRelationship = {
        from: "User",
        to: "Post",
        type: "oneToMany",
        confidence: 0.95,
        reasoning: "Users can have multiple posts",
        foreignKey: "user_id",
      };

      const manyToMany: SuggestedRelationship = {
        from: "User",
        to: "Role",
        type: "manyToMany",
        confidence: 0.8,
        reasoning: "Users can have multiple roles",
        foreignKey: "user_roles",
      };

      expect(oneToMany.type).toBe("oneToMany");
      expect(manyToMany.type).toBe("manyToMany");
      expect(oneToMany.confidence).toBeGreaterThan(0.9);
    });
  });

  describe("VisualPattern", () => {
    it("should define visual patterns correctly", () => {
      const cardPattern: VisualPattern = {
        type: "card_pattern",
        description: "Product card layout with image and text",
        confidence: 0.88,
        suggestedEntity: "Product",
        boundingBox: { x: 10, y: 20, width: 200, height: 150 },
      };

      const formPattern: VisualPattern = {
        type: "form_structure",
        description: "Login form with email and password fields",
        confidence: 0.92,
        suggestedEntity: "User",
      };

      expect(cardPattern.type).toBe("card_pattern");
      expect(cardPattern.boundingBox).toBeDefined();
      expect(formPattern.boundingBox).toBeUndefined(); // Optional field
    });
  });

  describe("APIEndpoint", () => {
    it("should define REST endpoints correctly", () => {
      const getEndpoint: APIEndpoint = {
        method: "GET",
        path: "/api/users/:id",
        handler: "getUserById",
        description: "Get user by ID",
        params: ["id"],
        response: "User object",
      };

      const postEndpoint: APIEndpoint = {
        method: "POST",
        path: "/api/users",
        handler: "createUser",
        description: "Create new user",
        body: "User creation data",
        response: "Created user object",
      };

      expect(getEndpoint.method).toBe("GET");
      expect(getEndpoint.params).toEqual(["id"]);
      expect(postEndpoint.method).toBe("POST");
      expect(postEndpoint.body).toBeDefined();
    });
  });

  describe("GeneratedBackend", () => {
    it("should have complete backend structure", () => {
      const backend: GeneratedBackend = {
        files: [
          {
            path: "schema.sql",
            content: "CREATE TABLE users();",
            type: "database",
          },
        ],
        models: [
          {
            name: "User",
            tableName: "users",
            fields: [{ name: "id", type: "uuid", required: true }],
            indexes: [],
            relationships: [],
          },
        ],
        endpoints: [
          {
            method: "GET",
            path: "/api/users",
            handler: "getUsers",
            description: "Get all users",
          },
        ],
        config: {
          projectName: "test-backend",
          openaiApiKey: "sk-test",
          debug: false,
          enableSpatialQueries: false,
        },
        deploymentFiles: [],
      };

      expect(backend.files).toHaveLength(1);
      expect(backend.models).toHaveLength(1);
      expect(backend.endpoints).toHaveLength(1);
      expect(backend.config.projectName).toBe("test-backend");
    });
  });

  describe("Type Safety Validation", () => {
    it("should enforce required fields", () => {
      // This test ensures TypeScript compilation catches missing required fields

      // Valid entity
      const validEntity: DetectedEntity = {
        name: "Test",
        tableName: "tests",
        fields: [],
        confidence: 0.8,
        reasoning: "Test reasoning",
      };

      expect(validEntity.name).toBe("Test");

      // Test that optional fields can be omitted
      const minimalEntity: DetectedEntity = {
        name: "Minimal",
        tableName: "minimals",
        fields: [],
        confidence: 0.5,
        reasoning: "Minimal reasoning",
      };

      expect(minimalEntity.description).toBeUndefined();
      expect(minimalEntity.indexes).toBeUndefined();
    });

    it("should enforce enum values for relationship types", () => {
      const validTypes: SuggestedRelationship["type"][] = [
        "oneToOne",
        "oneToMany",
        "manyToMany",
      ];

      validTypes.forEach((type) => {
        const relationship: SuggestedRelationship = {
          from: "A",
          to: "B",
          type,
          confidence: 0.8,
          reasoning: "Test",
        };
        expect(relationship.type).toBe(type);
      });
    });

    it("should enforce HTTP methods for endpoints", () => {
      const validMethods: APIEndpoint["method"][] = [
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH",
      ];

      validMethods.forEach((method) => {
        const endpoint: APIEndpoint = {
          method,
          path: "/test",
          handler: "test",
          description: "Test endpoint",
        };
        expect(endpoint.method).toBe(method);
      });
    });
  });
});
