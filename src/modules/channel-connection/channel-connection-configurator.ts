import { type RootConfig } from "../configuration/app-config";
import { ChannelConnection } from "./channel-connection.schema";
import { generateId } from "@/lib/generate-id";

export class ChannelConnectionConfigurator {
  private rootData: RootConfig.Shape;

  constructor(rootData: RootConfig.Shape) {
    this.rootData = rootData;
  }

  getConnections() {
    return this.rootData.connections;
  }

  getConnectionById(id: string) {
    return this.rootData.connections.find((p) => p.id === id);
  }

  addConnection(input: ChannelConnection.InputShape) {
    const connectionConfig = ChannelConnection.Schema.Input.parse(input);

    this.rootData.connections.push({
      ...connectionConfig,
      id: generateId(),
    });

    return this;
  }

  updateConnection(connection: ChannelConnection.FullShape) {
    const parsedConfig = ChannelConnection.Schema.Full.parse(connection);

    this.rootData.connections = this.rootData.connections.map((p) => {
      if (p.id === parsedConfig.id) {
        return parsedConfig;
      }

      return p;
    });
  }

  deleteConnection(connectionId: string) {
    this.rootData.connections = this.rootData.connections.filter((p) => p.id !== connectionId);
  }
}
