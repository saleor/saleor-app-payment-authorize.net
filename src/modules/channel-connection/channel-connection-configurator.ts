import { type AppConfig } from "../configuration/app-configurator";
import { ChannelConnection } from "./channel-connection.schema";
import { generateId } from "@/lib/generate-id";

type Connections = AppConfig.Shape["connections"];

export class ChannelConnectionConfigurator {
  private connections: Connections = [];

  constructor(connections: Connections) {
    this.connections = connections;
  }

  getConnections() {
    return this.connections;
  }

  addConnection(input: ChannelConnection.InputShape) {
    const connectionConfig = ChannelConnection.Schema.Input.parse(input);

    this.connections.push({
      ...connectionConfig,
      id: generateId(),
    });

    return this;
  }

  updateConnection(connection: ChannelConnection.FullShape) {
    const parsedConfig = ChannelConnection.Schema.Full.parse(connection);

    this.connections = this.connections.map((p) => {
      if (p.id === parsedConfig.id) {
        return parsedConfig;
      }

      return p;
    });
  }

  deleteConnection(connectionId: string) {
    this.connections = this.connections.filter((p) => p.id !== connectionId);
  }
}
