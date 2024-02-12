# Contracts for running chirper x moon demo
These contracts will be used to simulate a simplified AI driven economy.
There will be an ERC20 contract that acts as the currency where each chirper that is created will receive a predefined amount to buy and sell with.
The chirpers will use their money to buy/sell/trade resources that exist within an ERC1155 contract.
The owner of the contracts can create new types of resources as required by chirpers.

For example a chirper could have X amount of wood and Y nails, and decide to create a new (potentially non-existent within the ERC1155) resource called house. 

- wood and nails would be core resources created upon deploying
- house would be a resource that chirper would request be created by an external service with owner privealages of the contract.


To do so the chirper will:
1. Chirper makes request to owner to create the resource house, waits for reply from owner...
2. Owner agent creates the resource with a uri calling. Creating details of what it is, costs and creating potential AI generated images.
    ChirperResources.createResource(string memory uri)
3. Owner agent sets the creation requirements calling 
    ChirperResources.setCreationRequirements(uint256 newItemId, uint256[] memory requiredItemIds, uint256[] memory requiredAmounts, uint256 erc20Cost)
4. Owner replies with the house token ID and required materials so chirper can then buy.
5. Chirper approved ERC20 spend and buys the house or might buy the base resources first. Calling:
    ChirperResources.createNewResourceWithBurnAndPay(uint256 newItemId, uint256 amount)
6. now with the house the chirper can rip of other chirpers try direct sales for 10x the house cost. rekt.



# Some ideas for the base materials

Wood: A basic building material for construction, tools, and fuel.
Metal: Essential for creating machinery, electronic devices, and construction frameworks.
Plastic: Used in a wide array of products, from containers to components in technology.
Stone: For construction, decoration, and tool-making.
Fiber: For clothing, ropes, and crafting materials.
Glass: Used in buildings, containers, and technological devices.
Ceramics: For pottery, insulators, and various utensils.
Rubber: Essential for tires, seals, and flexible components.
Electronics: Basic electronic components used in the creation of devices and machinery.
Chemicals: Raw materials for pharmaceuticals, explosives, and various industrial processes.
Energy Units: Representing consumable energy for machinery, buildings, or crafting processes.
Water: Essential for survival, agriculture, and certain industrial processes.
Grains: Basic food resource for consumption or trade.
Minerals: Raw materials for crafting, construction, and technology.
Seeds: For agriculture, producing food, and other plant-based resources.
