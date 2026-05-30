import { Schema, Document, Model } from 'mongoose';
import { ClsService } from 'nestjs-cls';

// 1. Interfaz estricta para el usuario guardado en el contexto CLS
interface AuditUser {
  _id: string;
  firstName: string;
  lastName: string;
  [key: string]: unknown; // Permite otras propiedades sin caer en any
}

// 2. Interfaces para los contextos internos de Mongoose
interface MongooseQueryContext {
  model: Model<Document>;
  getQuery: () => { _id?: string };
}

interface MongooseDocumentContext extends Document {
  constructor: Model<Document>;
}

export function AuditLogPlugin(schema: Schema, cls: ClsService): void {
  // =========================================================================
  // 1. CAPTURAR EL "ANTES" (SOLO EN ACTUALIZACIONES Y BORRADOS)
  // =========================================================================
  const preMutationHooks = [
    'findOneAndUpdate',
    'updateOne',
    'deleteOne',
    'findOneAndDelete',
  ] as const;

  preMutationHooks.forEach((hook) => {
    schema.pre(hook, async function (this: MongooseQueryContext) {
      try {
        const query = this.getQuery();
        const docToUpdate = (await this.model.findOne(query).lean()) as Record<
          string,
          unknown
        > | null;

        if (docToUpdate) {
          // Guardamos en el CLS usando el ID único en formato string para evitar colisiones
          const docId = docToUpdate?._id ? docToUpdate?._id : 'default';
          cls.set(`prev_state_${docId as string}`, docToUpdate);
        }
      } catch (err) {
        console.error(`Error capturando estado anterior en pre-${hook}:`, err);
      }
    });
  });

  // =========================================================================
  // 2. PROCESAMIENTO CENTRALIZADO POST-MUTACIÓN (CREATE, UPDATE, DELETE)
  // =========================================================================
  const postMutationHooks = [
    'save',
    'findOneAndUpdate',
    'updateOne',
    'deleteOne',
    'findOneAndDelete',
  ] as const;

  postMutationHooks.forEach((hook) => {
    schema.post(hook, async function (this: unknown, doc: unknown) {
      try {
        // Resolvemos el constructor del modelo de forma segura y tipada
        let modelConstructor: Model<Document> | null = null;

        if (doc && typeof doc === 'object' && 'constructor' in doc) {
          modelConstructor = (doc as MongooseDocumentContext).constructor;
        } else if (this && typeof this === 'object' && 'model' in this) {
          modelConstructor = (this as MongooseQueryContext).model;
        }

        if (!modelConstructor || modelConstructor.modelName === 'AuditLog')
          return;

        // Extraemos las variables del CLS con sus respectivos tipos declarados
        const user = cls.get<AuditUser>('audit_user');
        const httpMethod = cls.get<string>('audit_method');
        const ip = cls.get<string>('audit_ip') || '127.0.0.1';

        // Si la mutación no viene de una petición HTTP autenticada, ignoramos
        if (!user || !httpMethod) return;

        // Recuperamos el ID del documento inspeccionando 'doc' o la Query de forma segura
        let docId = 'default';
        if (doc && typeof doc === 'object' && '_id' in doc) {
          docId = String((doc as Record<string, unknown>)._id);
        } else if (this && typeof this === 'object' && 'getQuery' in this) {
          const query = (this as MongooseQueryContext).getQuery();
          if (query._id) docId = String(query._id);
        }

        const previousState =
          cls.get<Record<string, unknown> | null>(`prev_state_${docId}`) ||
          null;

        // Saneamos el estado nuevo
        let newState: Record<string, unknown> | null = null;
        if (doc) {
          newState =
            typeof (doc as Document).toObject === 'function'
              ? (doc as Document).toObject()
              : (doc as Record<string, unknown>);
        }

        // 🔥 DEDUCCIÓN ATÓMICA DE LA ACCIÓN
        let action = 'UPDATE';
        if (httpMethod === 'POST') action = 'CREATE';

        if (
          httpMethod === 'DELETE' ||
          hook === 'deleteOne' ||
          hook === 'findOneAndDelete' ||
          (newState && newState['deleted'] === true)
        ) {
          action = 'DELETE';
        }

        // Si es un UPDATE pero no cambiaron los datos, cancelamos para no saturar MongoDB Atlas
        if (
          action === 'UPDATE' &&
          JSON.stringify(previousState) === JSON.stringify(newState)
        )
          return;

        // Invocamos el modelo de destino de forma dinámica y segura
        const AuditLogModel = modelConstructor.db.model('AuditLog');
        if (!AuditLogModel) return;
        await AuditLogModel.create({
          userId: user._id,
          userName: `${user.firstName} ${user.lastName}`,
          module: modelConstructor.modelName.toLowerCase(),
          action,
          previousState,
          newState: action === 'DELETE' ? null : newState,
          ipAddress: ip,
        });
      } catch (err) {
        console.error(
          `Error guardando bitácora automatizada en post-${hook}:`,
          err,
        );
      }
    });
  });
}
