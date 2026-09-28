resource "aws_vpc" "main" {
    cidr_block = var.vpc_cidr
    enable_dns_support = true
    enable_dns_hostnames = true
    
    tags = {
        Name = "${var.project_name}-${var.environment}-vpc"
    }
}

resource "aws_internet_gateway" "main" {
    vpc_id = aws_vpc.main.id

    tags = {
        Name = "${var.project_name}-${var.environment}-igw"
    }
}


resource "aws_subnet" "public" {
    count = length(var.public_subnet_cidrs)
    vpc_id = aws_vpc.main.id
    cidr_block = var.public_subnet_cidrs[count.index]
    availability_zone = var.availability_zones[count.index]
    map_public_ip_on_launch = true

    tags = {
        Name = "${var.project_name}-${var.environment}-public-subnet-${count.index + 1}"
        Type = "Public"
    }
}


// elastic ip for nat_gateway
resource "aws_eip" "nat" {
    count = length(var.public_subnet_cidrs)
    domain = "vpc"

    tags = {
       Name = "${var.project_name}-${var.environment}-nat-eip-${count.index + 1}"
    }
}


resource "aws_nat_gateway" "main" {
    count = length(var.public_subnet_cidrs)
    allocation_id = aws_eip.nat[count.index].id
    subnet_id     = aws_subnet.public[count.index].id

    tags = {
       Name = "${var.project_name}-${var.environment}-nat-gw-${count.index + 1}"
    }

    depends_on = [aws_internet_gateway.main]
}



resource "aws_subnet" "private_app" {
    count = length(var.private_app_subnet_cidrs)
    vpc_id = aws_vpc.main.id
    cidr_block = var.private_app_subnet_cidrs[count.index]
    availability_zone = var.availability_zones[count.index]

    tags = {
        Name = "${var.project_name}-${var.environment}-private-app-subnet-${count.index + 1}"
        Type = "PrivateApp"
    }
}



resource "aws_subnet" "private_db" {
    count = length(var.private_db_subnet_cidrs)
    vpc_id = aws_vpc.main.id
    cidr_block = var.private_db_subnet_cidrs[count.index]
    availability_zone = var.availability_zones[count.index]

    tags = {
        Name = "${var.project_name}-${var.environment}-private-db-subnet-${count.index + 1}"
        Type = "PrivateDb"
    }
}


resource "aws_route_table" "public" {
    vpc_id = aws_vpc.main.id
    
    route = {
       cidr_block = "0.0.0.0/0"
       gateway_id = aws_internet_gateway.main.id
    }

    tags = {
        Name = "${var.project_name}-${var.environment}-public-rt"
    }
}

resource "aws_route_table_association" "public" {
    count          = length(aws_subnet.public)
    subnet_id      = aws_subnet.public[count.index].id
    route_table_id = aws_route_table.public.id
}




# Route Tables for Private App Subnets
resource "aws_route_table" "private_app" {
  count  = length(var.private_app_subnet_cidrs)
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-private-app-rt-${count.index + 1}"
  }
}

resource "aws_route_table_association" "private_app" {
  count          = length(aws_subnet.private_app)
  subnet_id      = aws_subnet.private_app[count.index].id
  route_table_id = aws_route_table.private_app[count.index].id
}


resource "aws_route_table" "private_db" {
  count  = length(var.private_db_subnet_cidrs)
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-private-db-rt-${count.index + 1}"
  }
}

resource "aws_route_table_association" "private_db" {
  count          = length(aws_subnet.private_db)
  subnet_id      = aws_subnet.private_db[count.index].id
  route_table_id = aws_route_table.private_db[count.index].id
}
