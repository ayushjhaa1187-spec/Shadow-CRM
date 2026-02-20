import { Router, Request, Response } from "express";
import { ClientRepository } from "../services/clientRepository";

const router = Router();

/**
 * POST /api/clients
 * Create a new client with ICP profile
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      vertical,
      companySize,
      targetGeo,
      icpProfile,
    } = req.body;

    if (!name || !email || !vertical || !icpProfile) {
      return res.status(400).json({
        error: "name, email, vertical, and icpProfile are required",
      });
    }

    const client = await ClientRepository.createClient(
      name,
      email,
      vertical,
      companySize,
      targetGeo || [],
      icpProfile
    );

    res.status(201).json({
      success: true,
      data: client,
    });
  } catch (error: any) {
    console.error("Error creating client:", error);
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: "Failed to create client" });
  }
});

/**
 * GET /api/clients/:id
 * Get client by ID with ICP profile
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const client = await ClientRepository.getClientById(id);

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    // Get client statistics
    const stats = await ClientRepository.getClientStats(id);

    res.json({
      success: true,
      data: {
        ...client,
        stats,
      },
    });
  } catch (error) {
    console.error("Error getting client:", error);
    res.status(500).json({ error: "Failed to get client" });
  }
});

/**
 * GET /api/clients/email/:email
 * Get client by email
 */
router.get("/email/:email", async (req: Request, res: Response) => {
  try {
    const { email } = req.params;

    const client = await ClientRepository.getClientByEmail(email);

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    const stats = await ClientRepository.getClientStats(client.id);

    res.json({
      success: true,
      data: {
        ...client,
        stats,
      },
    });
  } catch (error) {
    console.error("Error getting client:", error);
    res.status(500).json({ error: "Failed to get client" });
  }
});

/**
 * GET /api/clients
 * Get all clients
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const clients = await ClientRepository.getAllClients();

    res.json({
      success: true,
      count: clients.length,
      data: clients,
    });
  } catch (error) {
    console.error("Error getting clients:", error);
    res.status(500).json({ error: "Failed to get clients" });
  }
});

/**
 * PATCH /api/clients/:id
 * Update client profile
 */
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, vertical, companySize, targetGeo } = req.body;

    const client = await ClientRepository.updateClient(id, {
      name,
      email,
      vertical,
      companySize,
      targetGeo,
    });

    res.json({
      success: true,
      data: client,
    });
  } catch (error: any) {
    console.error("Error updating client:", error);
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: "Failed to update client" });
  }
});

/**
 * PATCH /api/clients/:id/icp
 * Update client ICP profile
 */
router.patch("/:id/icp", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const icpProfile = req.body;

    const updated = await ClientRepository.updateIcpProfile(id, icpProfile);

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("Error updating ICP profile:", error);
    res.status(500).json({ error: "Failed to update ICP profile" });
  }
});

/**
 * GET /api/clients/:id/stats
 * Get client statistics
 */
router.get("/:id/stats", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const stats = await ClientRepository.getClientStats(id);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error getting stats:", error);
    res.status(500).json({ error: "Failed to get stats" });
  }
});

/**
 * DELETE /api/clients/:id
 * Delete client (cascades to related data)
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await ClientRepository.deleteClient(id);

    res.json({
      success: true,
      message: "Client deleted",
    });
  } catch (error) {
    console.error("Error deleting client:", error);
    res.status(500).json({ error: "Failed to delete client" });
  }
});

export default router;
