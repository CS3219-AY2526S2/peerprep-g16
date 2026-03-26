/**
 * DTO = Data Transfer Object
 * Defines the shape of data coming in from the API request body.
 *
 * Matches what Collaboration Service expects:
 * - Two separate difficulty fields (users may choose different levels)
 */
export class SimulateMatchDto {
  userAId: string;
  userBId: string;
  topic: string;
  userADifficulty: string;
  userBDifficulty: string;
}
