import { prisma } from "../lib/prisma";
import { Client, IcpProfile } from "@prisma/client";
import { IcpProfile as IcpType } from "../types";

export class ClientRepository {
  /**
   * Create a new client with ICP profile
   */
  static async createClient(
    name: string,
    email: string,
    vertical: string,
    companySize: string,
    targetGeo: string[],
    icpProfile: IcpType
  ): Promise<Client> {
    const client = await prisma.client.create({
      data: {
        name,
        email,
        vertical,
        companySize,
        targetGeo,
        icpProfile: {
          create: {
            industryMatch: icpProfile.industryMatch,
            minEmployees: icpProfile.minEmployees,
            maxEmployees: icpProfile.maxEmployees,
            geoMatch: icpProfile.geoMatch,
            minRevenue: icpProfile.minRevenue,
            maxRevenue: icpProfile.maxRevenue,
            requiredTechs: icpProfile.requiredTechs,
            preferredTechs: icpProfile.preferredTechs,
            minimumFitScore: icpProfile.minimumFitScore,
          },
        },
      },
      include: {
        icpProfile: true,
      },
    });

    return client;
  }

  /**
   * Get client by ID with ICP profile
   */
  static async getClientById(id: string): Promise<Client | null> {
    return prisma.client.findUnique({
      where: { id },
      include: {
        icpProfile: true,
      },
    });
  }

  /**
   * Get client by email
   */
  static async getClientByEmail(email: string): Promise<Client | null> {
    return prisma.client.findUnique({
      where: { email },
      include: {
        icpProfile: true,
      },
    });
  }

  /**
   * Get all clients
   */
  static async getAllClients(): Promise<Client[]> {
    return prisma.client.findMany({
      include: {
        icpProfile: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Update client ICP profile
   */
  static async updateIcpProfile(
    clientId: string,
    icpProfile: Partial<IcpType>
  ): Promise<IcpProfile> {
    return prisma.icpProfile.update({
      where: { clientId },
      data: {
        ...(icpProfile.industryMatch && { industryMatch: icpProfile.industryMatch }),
        ...(icpProfile.minEmployees && { minEmployees: icpProfile.minEmployees }),
        ...(icpProfile.maxEmployees && { maxEmployees: icpProfile.maxEmployees }),
        ...(icpProfile.geoMatch && { geoMatch: icpProfile.geoMatch }),
        ...(icpProfile.minRevenue && { minRevenue: icpProfile.minRevenue }),
        ...(icpProfile.maxRevenue && { maxRevenue: icpProfile.maxRevenue }),
        ...(icpProfile.requiredTechs && { requiredTechs: icpProfile.requiredTechs }),
        ...(icpProfile.preferredTechs && { preferredTechs: icpProfile.preferredTechs }),
        ...(icpProfile.minimumFitScore && { minimumFitScore: icpProfile.minimumFitScore }),
      },
    });
  }

  /**
   * Get client's ICP profile
   */
  static async getIcpProfile(clientId: string): Promise<IcpProfile | null> {
    return prisma.icpProfile.findUnique({
      where: { clientId },
    });
  }

  /**
   * Delete client and cascade delete related data
   */
  static async deleteClient(clientId: string): Promise<void> {
    await prisma.client.delete({
      where: { id: clientId },
    });
  }

  /**
   * Get client statistics
   */
  static async getClientStats(clientId: string): Promise<{
    totalLeads: number;
    tierA: number;
    tierB: number;
    tierC: number;
    lastLeadCreated: Date | null;
    conversionRate: number;
  }> {
    const leads = await prisma.lead.findMany({
      where: { clientId },
      select: { tier: true, status: true, createdAt: true },
    });

    const tierBreakdown = {
      A: leads.filter(l => l.tier === "A").length,
      B: leads.filter(l => l.tier === "B").length,
      C: leads.filter(l => l.tier === "C").length,
    };

    const contacted = leads.filter(l => ["contacted", "replied", "qualified"].includes(l.status)).length;
    const conversionRate = leads.length > 0 ? (contacted / leads.length) * 100 : 0;

    return {
      totalLeads: leads.length,
      tierA: tierBreakdown.A,
      tierB: tierBreakdown.B,
      tierC: tierBreakdown.C,
      lastLeadCreated: leads.length > 0 ? new Date(Math.max(...leads.map(l => l.createdAt.getTime()))) : null,
      conversionRate: Math.round(conversionRate * 100) / 100,
    };
  }

  /**
   * Get clients by vertical
   */
  static async getClientsByVertical(vertical: string): Promise<Client[]> {
    return prisma.client.findMany({
      where: {
        vertical: {
          contains: vertical,
          mode: "insensitive",
        },
      },
      include: {
        icpProfile: true,
      },
    });
  }

  /**
   * Update client profile
   */
  static async updateClient(
    clientId: string,
    data: Partial<{
      name: string;
      email: string;
      vertical: string;
      companySize: string;
      targetGeo: string[];
    }>
  ): Promise<Client> {
    return prisma.client.update({
      where: { id: clientId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.email && { email: data.email }),
        ...(data.vertical && { vertical: data.vertical }),
        ...(data.companySize && { companySize: data.companySize }),
        ...(data.targetGeo && { targetGeo: data.targetGeo }),
      },
      include: {
        icpProfile: true,
      },
    });
  }
}
