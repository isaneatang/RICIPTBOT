// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title DevicePassport
 * @notice One ERC-721 "Device Passport" per physical device.
 *
 * DESIGN DECISIONS (kept deliberately simple for a hackathon MVP):
 *
 * 1. ONE NFT per physical device. The passport can be transferred between
 *    owners (standard ERC-721 transferFrom) — we never mint a second NFT
 *    for a resale.
 *
 * 2. Only a dataHash + metadataURI + issuer + timestamp + status live
 *    on-chain. Raw sensitive fields (IMEI, serial, receipt number) are NEVER
 *    stored here. The dataHash commits to a canonical dataset without
 *    revealing it. See src/utils/hashing.js and README "Privacy model".
 *
 * 3. Anyone can mint (the connected user = issuer for the MVP). This is a
 *    deliberate product choice: RICIPT records provenance, it does not gate
 *    who may record. Later, retailer/manufacturer verification can tighten
 *    this via Ownable or a registry.
 *
 * 4. Status is a simple enum. Updates are allowed only by the contract
 *    owner, the passport issuer, or the current token owner. No DAO, no
 *    governance, no marketplace.
 *
 * IMPORTANT: an NFT here is a blockchain-backed provenance/purchase record.
 * It does NOT by itself constitute legal title or determine legal ownership
 * of the physical device.
 */

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract DevicePassport is ERC721, Ownable {
    // Passport lifecycle status. VERIFIED is the initial state on mint.
    enum Status {
        VERIFIED, // 0
        LOST,     // 1
        STOLEN,   // 2
        DISPUTED, // 3
        RECOVERED // 4
    }

    struct Passport {
        bytes32 dataHash; // keccak256 of canonical passport data (see README)
        string metadataURI; // optional off-chain metadata pointer (may be empty)
        address issuer; // wallet that minted / recorded the passport
        uint256 createdAt; // block.timestamp at mint
        Status status;
    }

    uint256 private _nextTokenId;

    mapping(uint256 => Passport) private _passports;

    // --- MVP discovery strategy -------------------------------------------
    // There is no indexer. To let "My Passports" find a wallet's tokens, we
    // keep per-owner token lists locally and maintain them on every transfer
    // via the _update hook. A future indexer (TheGraph/Covalent) can replace
    // this without changing the frontend contract.
    mapping(address => uint256[]) private _ownedTokens;
    mapping(uint256 => uint256) private _ownedTokensIndex;

    event PassportMinted(uint256 indexed tokenId, address indexed issuer, bytes32 dataHash);
    event StatusUpdated(uint256 indexed tokenId, Status status);

    constructor() ERC721("RICIPT Device Passport", "RCPT") Ownable(msg.sender) {}

    /**
     * @notice Mint a new Device Passport for the caller.
     * @param dataHash keccak256 of the canonical passport dataset.
     * @param metadataURI Optional URI pointing at display metadata. May be "".
     * @return tokenId The id of the new passport (1-based, auto-increment).
     * @dev The caller becomes both issuer and initial owner.
     */
    function mint(bytes32 dataHash, string calldata metadataURI) external returns (uint256 tokenId) {
        tokenId = ++_nextTokenId;

        _passports[tokenId] = Passport({
            dataHash: dataHash,
            metadataURI: metadataURI,
            issuer: msg.sender,
            createdAt: block.timestamp,
            status: Status.VERIFIED
        });

        _safeMint(msg.sender, tokenId);

        emit PassportMinted(tokenId, msg.sender, dataHash);
    }

    /**
     * @notice Read the full Passport struct for a token.
     * @dev Reverts for token ids that have never been minted.
     */
    function getPassport(uint256 tokenId) external view returns (Passport memory) {
        _requireMinted(tokenId);
        return _passports[tokenId];
    }

    /**
     * @notice Current lifecycle status of a passport.
     */
    function statusOf(uint256 tokenId) external view returns (Status) {
        _requireMinted(tokenId);
        return _passports[tokenId].status;
    }

    /**
     * @notice Token ids currently owned by `owner`. Backs the MVP's
     *         "My Passports" page without an indexer.
     */
    function passportsOfOwner(address owner) external view returns (uint256[] memory) {
        return _ownedTokens[owner];
    }

    /**
     * @notice Set the lifecycle status of a passport.
     * @dev Authorized callers: contract owner, passport issuer, current owner.
     */
    function updateStatus(uint256 tokenId, Status newStatus) external {
        _requireMinted(tokenId);

        Passport storage p = _passports[tokenId];
        require(
            msg.sender == owner() || msg.sender == p.issuer || msg.sender == ownerOf(tokenId),
            "DevicePassport: not authorized"
        );

        p.status = newStatus;
        emit StatusUpdated(tokenId, newStatus);
    }

    /**
     * @notice ERC-721 metadata URI. Empty unless a metadataURI was provided.
     * @dev The on-chain record is intentionally hash-based; device display
     *      data lives off-chain (see README privacy model).
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireMinted(tokenId);
        return _passports[tokenId].metadataURI;
    }

    // --- Internal bookkeeping --------------------------------------------
    // Keeps per-owner token lists in sync with ERC-721 transfers.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = super._update(to, tokenId, auth);

        if (from != address(0)) {
            _removeTokenFromOwnerList(from, tokenId);
        }
        if (to != address(0)) {
            _addTokenToOwnerList(to, tokenId);
        }

        return from;
    }

    function _addTokenToOwnerList(address to, uint256 tokenId) private {
        _ownedTokens[to].push(tokenId);
        _ownedTokensIndex[tokenId] = _ownedTokens[to].length - 1;
    }

    function _removeTokenFromOwnerList(address from, uint256 tokenId) private {
        uint256[] storage tokens = _ownedTokens[from];
        uint256 lastIndex = tokens.length - 1;
        uint256 index = _ownedTokensIndex[tokenId];

        if (index != lastIndex) {
            uint256 lastTokenId = tokens[lastIndex];
            tokens[index] = lastTokenId;
            _ownedTokensIndex[lastTokenId] = index;
        }

        tokens.pop();
        delete _ownedTokensIndex[tokenId];
    }

    function _requireMinted(uint256 tokenId) private view {
        require(_ownerOf(tokenId) != address(0), "DevicePassport: token does not exist");
    }
}