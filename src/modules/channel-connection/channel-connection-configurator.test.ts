import { beforeEach, describe, expect, it } from "vitest";
import { type RootConfig } from "../configuration/app-configurator";
import { ChannelConnectionConfigurator } from "./channel-connection-configurator";

let rootData: RootConfig.Shape["connections"] = [];

beforeEach(() => {
  rootData = [];
});

describe("ChannelConnectionConfigurator", () => {
  describe("getConnections", () => {
    it("returns all connections", () => {
      const configurator = new ChannelConnectionConfigurator([
        {
          id: "1",
          channelSlug: "channel-slug-1",
          providerId: "provider-id-1",
        },
        {
          id: "2",
          channelSlug: "channel-slug-2",
          providerId: "provider-id-2",
        },
      ]);

      expect(configurator.getConnections()).toEqual([
        {
          id: "1",
          channelSlug: "channel-slug-1",
          providerId: "provider-id-1",
        },
        {
          id: "2",
          channelSlug: "channel-slug-2",
          providerId: "provider-id-2",
        },
      ]);
    });
  });

  describe("addConnection", () => {
    it("adds a connection", () => {
      const configurator = new ChannelConnectionConfigurator(rootData);

      configurator.addConnection({
        channelSlug: "channel-slug",
        providerId: "provider-id",
      });

      expect(configurator.getConnections()).toEqual([
        {
          id: expect.any(String),
          channelSlug: "channel-slug",
          providerId: "provider-id",
        },
      ]);
    });
  });

  describe("updateConnection", () => {
    it("updates a connection", () => {
      const configurator = new ChannelConnectionConfigurator([
        {
          id: "1",
          channelSlug: "channel-slug-1",
          providerId: "provider-id-1",
        },
      ]);

      configurator.updateConnection({
        id: "1",
        channelSlug: "channel-slug-2",
        providerId: "provider-id-2",
      });

      expect(configurator.getConnections()).toEqual([
        {
          id: "1",
          channelSlug: "channel-slug-2",
          providerId: "provider-id-2",
        },
      ]);
    });

    it("doesn't update a connection if the id doesn't match", () => {
      const configurator = new ChannelConnectionConfigurator([
        {
          id: "1",
          channelSlug: "channel-slug-1",
          providerId: "provider-id-1",
        },
      ]);

      configurator.updateConnection({
        id: "2",
        channelSlug: "channel-slug-2",
        providerId: "provider-id-2",
      });

      expect(configurator.getConnections()).toEqual([
        {
          id: "1",
          channelSlug: "channel-slug-1",
          providerId: "provider-id-1",
        },
      ]);
    });
  });

  describe("deleteConnection", () => {
    it("deletes a connection", () => {
      const configurator = new ChannelConnectionConfigurator([
        {
          id: "1",
          channelSlug: "channel-slug-1",
          providerId: "provider-id-1",
        },
        {
          id: "2",
          channelSlug: "channel-slug-2",
          providerId: "provider-id-2",
        },
      ]);

      configurator.deleteConnection("1");

      expect(configurator.getConnections()).toEqual([
        {
          id: "2",
          channelSlug: "channel-slug-2",
          providerId: "provider-id-2",
        },
      ]);
    });

    it("doesn't delete a connection if the id doesn't match", () => {
      const configurator = new ChannelConnectionConfigurator([
        {
          id: "1",
          channelSlug: "channel-slug-1",
          providerId: "provider-id-1",
        },
        {
          id: "2",
          channelSlug: "channel-slug-2",
          providerId: "provider-id-2",
        },
      ]);

      configurator.deleteConnection("3");

      expect(configurator.getConnections()).toEqual([
        {
          id: "1",
          channelSlug: "channel-slug-1",
          providerId: "provider-id-1",
        },
        {
          id: "2",
          channelSlug: "channel-slug-2",
          providerId: "provider-id-2",
        },
      ]);
    });
  });
});
