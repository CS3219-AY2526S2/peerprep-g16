resource "aws_instance" "peerprep" {
  ami                    = "ami-0e7ff22101b84bcff"
  instance_type          = "t3.medium"
  key_name               = var.key_name
  subnet_id              = "subnet-024784abf987d7d6d"
  vpc_security_group_ids = [aws_security_group.peerprep_sg.id]
  iam_instance_profile   = aws_iam_instance_profile.peerprep_instance_profile.name

  tags = {
    Name    = var.project_name
    Project = var.project_name
  }
}