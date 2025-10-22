import crypto from "crypto";
import { ICryptoService } from "./interfaces/ICryptoService.js";

export class CryptoService implements ICryptoService {
  hashText(text: string): string {
    return crypto.createHash("sha256").update(text).digest("hex");
  }
}
